import { buildSystemPrompt } from "@/lib/assistant/prompt";
import { routing } from "@/i18n/routing";

// Website assistant endpoint. Proxies the conversation to Groq (OpenAI-
// compatible API) and streams the answer back as plain text. The API key
// never leaves the server.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.CHAT_MODEL || "openai/gpt-oss-120b";

const MAX_HISTORY = 8; // messages sent to the model, including the new one
const MAX_MESSAGE_CHARS = 800;
const MAX_ANSWER_TOKENS = 700; // includes the model's (low-effort) reasoning
const UPSTREAM_TIMEOUT_MS = 30_000;

// Per-visitor limits. In memory, so they are per server process: fine for a
// single Node process on the VPS; use a shared store if you run several.
const LIMITS = [
  { windowMs: 60_000, max: 6 },
  { windowMs: 60 * 60_000, max: 40 },
];
const LONGEST_WINDOW_MS = Math.max(...LIMITS.map((l) => l.windowMs));
const hits = new Map<string, number[]>();

type ChatMessage = { role: "user" | "assistant"; content: string };

function clientIp(request: Request): string {
  // Behind nginx, X-Real-IP is set from the real connection and can't be
  // spoofed by the client (see the deployment notes for the nginx config).
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Drop visitors with no recent requests so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (now - times[times.length - 1] > LONGEST_WINDOW_MS) hits.delete(key);
    }
  }

  const times = (hits.get(ip) ?? []).filter(
    (t) => now - t < LONGEST_WINDOW_MS,
  );
  const limited = LIMITS.some(
    ({ windowMs, max }) => times.filter((t) => now - t < windowMs).length >= max,
  );
  if (!limited) times.push(now);
  hits.set(ip, times);
  return limited;
}

function parseBody(
  body: unknown,
): { messages: ChatMessage[]; locale: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { messages, locale } = body as Record<string, unknown>;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const clean: ChatMessage[] = [];
  for (const m of messages.slice(-MAX_HISTORY)) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > MAX_MESSAGE_CHARS * 3) return null;
    clean.push({ role, content: text });
  }

  // The API expects the conversation to start with the visitor.
  while (clean.length > 0 && clean[0].role !== "user") clean.shift();
  const last = clean[clean.length - 1];
  if (!last || last.role !== "user" || last.content.length > MAX_MESSAGE_CHARS) {
    return null;
  }

  const safeLocale =
    typeof locale === "string" &&
    (routing.locales as readonly string[]).includes(locale)
      ? locale
      : routing.defaultLocale;

  return { messages: clean, locale: safeLocale };
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

// Turns Groq's server-sent events into a stream of plain answer text.
function toTextStream(upstream: ReadableStream<Uint8Array>) {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let emitted = false;
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              reader.cancel().catch(() => {});
              return;
            }
            try {
              const text = JSON.parse(data).choices?.[0]?.delta?.content;
              if (typeof text === "string" && text) {
                controller.enqueue(encoder.encode(text));
                emitted = true;
              }
            } catch {
              // Ignore malformed or keep-alive lines.
            }
          }
          if (emitted) return;
        }
      } catch {
        // Upstream failed mid-answer: end the stream; the client keeps what
        // it already received.
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[chat] GROQ_API_KEY is not set");
    return jsonError("unavailable", 503);
  }

  if (isRateLimited(clientIp(request))) {
    return jsonError("rate_limited", 429);
  }

  let parsed;
  try {
    parsed = parseBody(await request.json());
  } catch {
    parsed = null;
  }
  if (!parsed) return jsonError("bad_request", 400);

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(parsed.locale) },
          ...parsed.messages,
        ],
        temperature: 0.2,
        max_completion_tokens: MAX_ANSWER_TOKENS,
        reasoning_effort: "low",
        include_reasoning: false,
        stream: true,
      }),
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    console.error("[chat] Groq request failed:", error);
    return jsonError("unavailable", 503);
  }

  if (!upstream.ok || !upstream.body) {
    // 429 = Groq free-tier quota reached; anything else is an upstream error.
    console.error(
      `[chat] Groq responded ${upstream.status}:`,
      await upstream.text().catch(() => ""),
    );
    return jsonError(upstream.status === 429 ? "busy" : "unavailable", 503);
  }

  return new Response(toTextStream(upstream.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Stop nginx from buffering the stream on the VPS.
      "X-Accel-Buffering": "no",
    },
  });
}
