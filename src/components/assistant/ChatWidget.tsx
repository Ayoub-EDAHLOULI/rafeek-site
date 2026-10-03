"use client";

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type SubmitEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, m } from "motion/react";
import { Link } from "@/i18n/navigation";
import logo from "@/assets/logo.png";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ErrorKind = "busy" | "rateLimit" | "generic" | "tooLong";

const MAX_CHARS = 800;
const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: "spring", stiffness: 260, damping: 20 } as const;

// Turn site paths (/download, /features, /docs) into locale-aware links and
// full URLs into external links. Everything else stays plain text.
const LINK_PATTERN =
  /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|\/(?:download|features|docs)\b)/g;

function renderWithLinks(text: string): ReactNode[] {
  return text.split(LINK_PATTERN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const className = "font-medium text-primary underline underline-offset-2";
    return part.startsWith("/") ? (
      <Link key={i} href={part} className={className}>
        {part}
      </Link>
    ) : (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {part}
      </a>
    );
  });
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 py-1" role="status">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <m.span
          key={i}
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-subtext"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export default function ChatWidget() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<ErrorKind | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view while the answer streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, error, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    if (content.length > MAX_CHARS) {
      setError("tooLong");
      return;
    }

    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let received = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, locale }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const { error: code } = await res.json().catch(() => ({ error: "" }));
        setError(
          res.status === 429
            ? "rateLimit"
            : code === "busy"
              ? "busy"
              : "generic",
        );
        return;
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value;
        setMessages([...history, { role: "assistant", content: received }]);
      }
      if (!received.trim()) setError("generic");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("generic");
    } finally {
      // Drop an empty assistant bubble (failed or stopped before any text).
      if (!received.trim()) setMessages(history);
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  const errorText: Record<ErrorKind, string> = {
    busy: t("errorBusy"),
    rateLimit: t("errorRateLimit"),
    generic: t("errorGeneric"),
    tooLong: t("errorTooLong"),
  };
  const suggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3")];
  const lastIndex = messages.length - 1;

  return (
    <>
      <AnimatePresence>
        {open && (
          <m.div
            id={panelId}
            role="dialog"
            aria-label={t("title")}
            onKeyDown={(e) => e.key === "Escape" && close()}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-x-4 bottom-24 z-50 flex h-[min(560px,calc(100dvh-8rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:inset-e-6 sm:w-95 rtl:origin-bottom-left"
          >
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Image
                src={logo}
                alt=""
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{t("title")}</p>
                <p className="truncate text-xs text-subtext">{t("subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-subtext transition-colors hover:bg-input-bg hover:text-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-busy={streaming}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-input-bg px-3.5 py-2.5 text-sm leading-relaxed text-text">
                {t("welcome")}
              </div>

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-start text-xs text-text transition-colors hover:border-primary/50 hover:bg-input-bg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={
                    msg.role === "user"
                      ? "ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-white"
                      : "max-w-[85%] rounded-2xl rounded-ss-sm bg-input-bg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-text"
                  }
                >
                  <span className="sr-only">
                    {msg.role === "user" ? t("you") : t("assistant")}:{" "}
                  </span>
                  {msg.role === "assistant" && !msg.content && i === lastIndex ? (
                    <TypingDots label={t("thinking")} />
                  ) : msg.role === "assistant" ? (
                    renderWithLinks(msg.content)
                  ) : (
                    msg.content
                  )}
                </m.div>
              ))}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/30 px-3.5 py-2.5 text-sm text-danger"
                >
                  {errorText[error]}
                </p>
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-border px-3 pt-3 pb-2"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={MAX_CHARS}
                  placeholder={t("placeholder")}
                  aria-label={t("placeholder")}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-subtext focus:border-primary focus:outline-none"
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-input-bg"
                  >
                    {t("stop")}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {t("send")}
                  </button>
                )}
              </div>
              <p className="mt-2 px-1 text-[11px] leading-snug text-subtext">
                {t("disclaimer")}
              </p>
            </form>
          </m.div>
        )}
      </AnimatePresence>

      <m.button
        ref={toggleRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        initial={{ opacity: 0, scale: 0.6 }}
        // Delay only the entrance; hover/tap must respond immediately.
        animate={{ opacity: 1, scale: 1, transition: { ...SPRING, delay: 0.6 } }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING}
        className="fixed inset-e-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <m.svg
              key="close"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-text"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </m.svg>
          ) : (
            <m.span
              key="robot"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                src={logo}
                alt=""
                width={34}
                height={34}
                className="rounded-lg"
              />
            </m.span>
          )}
        </AnimatePresence>
      </m.button>
    </>
  );
}
