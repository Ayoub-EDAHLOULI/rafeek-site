"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Resting drift velocity the particle eases back to.
  dx: number;
  dy: number;
  r: number;
  // Per-frame visibility: radial fade (0..1) and eased cursor proximity (0..1).
  fade: number;
  hover: number;
};

const AREA_PER_PARTICLE = 14000;
const MAX_PARTICLES = 110;
const MAX_PARTICLES_SMALL = 30;
const SMALL_BREAKPOINT = 640;
const MAX_DPR = 2;
const DRIFT_SPEED = 0.25;
const LINK_DISTANCE = 120;
const LINK_DISTANCE_SMALL = 90;
const ATTRACT_RADIUS = 160;
const ATTRACT_STRENGTH = 0.06;
// Inside this radius particles are pushed out slightly so they ring the
// cursor instead of collapsing onto a single point.
const CLUSTER_RADIUS = 28;
const DAMPING = 0.04;
const MAX_SPEED = 3;
const DOT_RADIUS = 2;
const DOT_RADIUS_VARIATION = 0.5;
const DOT_ALPHA = 0.6;
const LINK_ALPHA = 0.4;
// Extra alpha for dots and lines inside the pull radius, plus a soft halo.
const HOVER_DOT_BOOST = 0.4;
const HOVER_LINK_BOOST = 0.35;
const HOVER_EASE = 0.12;
const GLOW_ALPHA = 0.18;
const GLOW_SCALE = 3.5;
// Radial fade: particles behind the hero text keep CENTER_ALPHA of their
// strength, ramping to full between FADE_INNER and FADE_OUTER (in units of
// the text-block ellipse).
const CENTER_ALPHA = 0.3;
const FADE_INNER = 0.35;
const FADE_OUTER = 1.05;
const FADE_MAX_RADIUS_X = 460;
// Alphas are quantised into buckets so a frame needs at most a few dozen
// stroke/fill calls regardless of how many lines are visible.
const ALPHA_LEVELS = 32;
const FALLBACK_COLOR = "#1d63ed";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createBuckets(): number[][] {
  return Array.from({ length: ALPHA_LEVELS + 1 }, () => []);
}

function bucketFor(buckets: number[][], alpha: number) {
  return buckets[Math.min(ALPHA_LEVELS, Math.round(alpha * ALPHA_LEVELS))];
}

// Secondary layer of smaller "dust" dots (no lines) for depth. Linear cost:
// they are moved and drawn but never paired.
const DUST_RATIO = 0.5;
const DUST_RADIUS = 1;
const DUST_RADIUS_VARIATION = 1.2;
const DUST_ALPHA = 0.5;

function createParticle(
  width: number,
  height: number,
  radius = DOT_RADIUS,
  variation = DOT_RADIUS_VARIATION,
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = DRIFT_SPEED * (0.4 + Math.random() * 0.6);
  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: dx,
    vy: dy,
    dx,
    dy,
    r: radius + Math.random() * variation,
    fade: 1,
    hover: 0,
  };
}

function targetCount(width: number, height: number) {
  const cap = width < SMALL_BREAKPOINT ? MAX_PARTICLES_SMALL : MAX_PARTICLES;
  return Math.min(cap, Math.round((width * height) / AREA_PER_PARTICLE));
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const particles: Particle[] = [];
    const dust: Particle[] = [];
    let focus = { cx: 0, cy: 0, rx: 1, ry: 1 };
    let color = FALLBACK_COLOR;
    let rect = canvas.getBoundingClientRect();
    let pointer: { x: number; y: number } | null = null;

    let frame = 0;
    let lastTime = 0;
    let tabVisible = document.visibilityState === "visible";
    let inView = true;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const readColor = () => {
      const value = getComputedStyle(canvas)
        .getPropertyValue("--particle-color")
        .trim();
      color = value || FALLBACK_COLOR;
    };

    const lineBuckets = createBuckets();
    const dotBuckets = createBuckets();
    const glowBuckets = createBuckets();

    // Bucket 0 is effectively invisible and skipped.
    const strokeLines = () => {
      for (let k = 1; k <= ALPHA_LEVELS; k++) {
        const bucket = lineBuckets[k];
        if (bucket.length === 0) continue;
        ctx.globalAlpha = k / ALPHA_LEVELS;
        ctx.beginPath();
        for (let i = 0; i < bucket.length; i += 4) {
          ctx.moveTo(bucket[i], bucket[i + 1]);
          ctx.lineTo(bucket[i + 2], bucket[i + 3]);
        }
        ctx.stroke();
      }
      for (const bucket of lineBuckets) bucket.length = 0;
    };

    const fillCircles = (buckets: number[][]) => {
      for (let k = 1; k <= ALPHA_LEVELS; k++) {
        const bucket = buckets[k];
        if (bucket.length === 0) continue;
        ctx.globalAlpha = k / ALPHA_LEVELS;
        ctx.beginPath();
        for (let i = 0; i < bucket.length; i += 3) {
          const x = bucket[i];
          const y = bucket[i + 1];
          const r = bucket[i + 2];
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      for (const bucket of buckets) bucket.length = 0;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      // Ellipse around the hero text block (see measureFocus). Symmetric, so
      // it behaves the same in LTR and RTL.
      const { cx, cy, rx, ry } = focus;
      for (const list of [particles, dust]) {
        for (const p of list) {
          const d = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
          p.fade =
            CENTER_ALPHA +
            (1 - CENTER_ALPHA) * smoothstep(FADE_INNER, FADE_OUTER, d);
        }
      }

      const linkDistance =
        width < SMALL_BREAKPOINT ? LINK_DISTANCE_SMALL : LINK_DISTANCE;
      const linkDistanceSq = linkDistance * linkDistance;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const ddx = a.x - b.x;
          const ddy = a.y - b.y;
          const distSq = ddx * ddx + ddy * ddy;
          if (distSq > linkDistanceSq) continue;
          const strength = 1 - Math.sqrt(distSq) / linkDistance;
          const alpha =
            strength *
            (LINK_ALPHA * Math.min(a.fade, b.fade) +
              HOVER_LINK_BOOST * Math.min(a.hover, b.hover));
          bucketFor(lineBuckets, alpha).push(a.x, a.y, b.x, b.y);
        }
      }
      strokeLines();

      for (const p of particles) {
        if (p.hover > 0) {
          bucketFor(glowBuckets, GLOW_ALPHA * p.hover).push(
            p.x,
            p.y,
            p.r * GLOW_SCALE,
          );
        }
        const alpha = DOT_ALPHA * p.fade + HOVER_DOT_BOOST * p.hover;
        bucketFor(dotBuckets, alpha).push(p.x, p.y, p.r);
      }
      for (const p of dust) {
        const alpha = DUST_ALPHA * p.fade + HOVER_DOT_BOOST * p.hover;
        bucketFor(dotBuckets, alpha).push(p.x, p.y, p.r);
      }
      fillCircles(glowBuckets);
      fillCircles(dotBuckets);
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      let target: { x: number; y: number } | null = null;
      if (pointer) {
        const x = pointer.x - rect.left;
        const y = pointer.y - rect.top;
        if (x >= 0 && y >= 0 && x <= width && y <= height) target = { x, y };
      }

      for (const list of [particles, dust]) {
        for (const p of list) move(p, target, dt);
      }
    };

    const move = (
      p: Particle,
      target: { x: number; y: number } | null,
      dt: number,
    ) => {
      let hover = 0;
      if (target) {
        const tx = target.x - p.x;
        const ty = target.y - p.y;
        const dist = Math.hypot(tx, ty);
        if (dist > 0.01 && dist < ATTRACT_RADIUS) {
          const falloff = 1 - dist / ATTRACT_RADIUS;
          hover = falloff;
          const force =
            dist > CLUSTER_RADIUS
              ? ATTRACT_STRENGTH * falloff
              : -ATTRACT_STRENGTH * (1 - dist / CLUSTER_RADIUS);
          p.vx += (tx / dist) * force * dt;
          p.vy += (ty / dist) * force * dt;
        }
      }

      // Ease the highlight too, so it fades out instead of switching off.
      p.hover += (hover - p.hover) * Math.min(1, HOVER_EASE * dt);

      // Ease velocity back toward the resting drift.
      const damping = Math.min(1, DAMPING * dt);
      p.vx += (p.dx - p.vx) * damping;
      p.vy += (p.dy - p.vy) * damping;

      const speed = Math.hypot(p.vx, p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around the edges with a small margin so dots don't pop.
      const margin = 10;
      if (p.x < -margin) p.x = width + margin;
      else if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      else if (p.y > height + margin) p.y = -margin;
    };

    const tick = (time: number) => {
      // Normalise to 60fps frames; clamp so a long gap doesn't teleport dots.
      const dt = lastTime ? Math.min((time - lastTime) / 16.667, 3) : 1;
      lastTime = time;
      step(dt);
      draw();
      frame = requestAnimationFrame(tick);
    };

    const shouldAnimate = () =>
      tabVisible && inView && !reducedMotionQuery.matches;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const syncLoop = () => {
      if (shouldAnimate()) {
        if (!frame) {
          lastTime = 0;
          frame = requestAnimationFrame(tick);
        }
      } else {
        stop();
        // A paused or static frame shouldn't keep a frozen cursor highlight.
        for (const list of [particles, dust]) {
          for (const p of list) p.hover = 0;
        }
        draw();
      }
    };

    // The radial fade centres on a sibling marked [data-particle-focus] (the
    // hero text), falling back to the whole canvas.
    const measureFocus = () => {
      const target = canvas.parentElement?.querySelector(
        "[data-particle-focus]",
      );
      const box = target?.getBoundingClientRect();
      if (box && box.width > 0 && box.height > 0) {
        focus = {
          cx: box.left - rect.left + box.width / 2,
          cy: box.top - rect.top + box.height / 2,
          rx: Math.min(box.width / 2, FADE_MAX_RADIUS_X),
          ry: box.height / 2,
        };
      } else {
        focus = {
          cx: width / 2,
          cy: height / 2,
          rx: Math.min(width / 2, FADE_MAX_RADIUS_X),
          ry: height / 2,
        };
      }
    };

    const resize = () => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (nextWidth === 0 || nextHeight === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (width && height) {
        const sx = nextWidth / width;
        const sy = nextHeight / height;
        for (const list of [particles, dust]) {
          for (const p of list) {
            p.x *= sx;
            p.y *= sy;
          }
        }
      }
      width = nextWidth;
      height = nextHeight;
      rect = canvas.getBoundingClientRect();
      measureFocus();

      const count = targetCount(width, height);
      if (particles.length > count) {
        particles.length = count;
      } else {
        while (particles.length < count) {
          particles.push(createParticle(width, height));
        }
      }

      const dustCount = Math.round(count * DUST_RATIO);
      if (dust.length > dustCount) {
        dust.length = dustCount;
      } else {
        while (dust.length < dustCount) {
          dust.push(
            createParticle(width, height, DUST_RADIUS, DUST_RADIUS_VARIATION),
          );
        }
      }

      // Resizing the backing store clears it; repaint right away.
      draw();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      rect = canvas.getBoundingClientRect();
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) pointer = null;
    };

    const clearPointer = () => {
      pointer = null;
    };

    const onScroll = () => {
      rect = canvas.getBoundingClientRect();
    };

    const onVisibilityChange = () => {
      tabVisible = document.visibilityState === "visible";
      syncLoop();
    };

    const onThemeChange = () => {
      readColor();
      if (!frame) draw();
    };

    readColor();
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncLoop();
    });
    intersectionObserver.observe(canvas);

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotionQuery.addEventListener("change", syncLoop);
    darkSchemeQuery.addEventListener("change", onThemeChange);

    syncLoop();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", syncLoop);
      darkSchemeQuery.removeEventListener("change", onThemeChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
