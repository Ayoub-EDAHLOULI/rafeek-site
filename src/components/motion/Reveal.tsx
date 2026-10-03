"use client";

import { Fragment, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { m, stagger, type Variants } from "motion/react";
import { rtlLocales } from "@/i18n/routing";

// Long, soft deceleration: moves early, then settles slowly.
const EASE = [0.16, 1, 0.3, 1] as const;

// Reveal once, slightly before the element is fully in view.
const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

/**
 * Entrance styles, so pages don't all move the same way:
 * - rise:  fade up out of a light blur (default)
 * - scale: grow in from slightly smaller
 * - slide: come in from the inline start or end side (mirrors in RTL)
 * - focus: sharpen from a heavy blur while settling from slightly larger
 * - flip:  tilt up from the bottom edge, like a card being laid down
 */
export type Effect = "rise" | "scale" | "slide" | "focus" | "flip";
type Side = "start" | "end";

function effectVariants(
  effect: Effect,
  side: Side,
  rtl: boolean,
  delay: number,
): Variants {
  // Only set `delay` when non-zero: an explicit value replaces the stagger
  // offset a parent <Stagger> would otherwise assign.
  const settle = (duration: number) => ({
    duration,
    ease: EASE,
    ...(delay ? { delay } : {}),
  });

  switch (effect) {
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
        show: {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          transition: settle(1.1),
        },
      };
    case "slide": {
      // "start" is the left in LTR and the right in RTL.
      const fromLeft = (side === "start") !== rtl;
      return {
        hidden: { opacity: 0, x: fromLeft ? -40 : 40, filter: "blur(6px)" },
        show: {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          transition: settle(1.1),
        },
      };
    }
    case "focus":
      return {
        hidden: { opacity: 0, scale: 1.04, filter: "blur(14px)" },
        show: {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          transition: settle(1.3),
        },
      };
    case "flip":
      return {
        hidden: {
          opacity: 0,
          y: 32,
          rotateX: 22,
          transformPerspective: 900,
          filter: "blur(4px)",
        },
        show: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transformPerspective: 900,
          filter: "blur(0px)",
          transition: settle(1.2),
        },
      };
    case "rise":
    default:
      return {
        hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: settle(1.05),
        },
      };
  }
}

function useEffectVariants(effect: Effect, side: Side, delay = 0) {
  const rtl = rtlLocales.includes(useLocale());
  return effectVariants(effect, side, rtl, delay);
}

const word: Variants = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: EASE },
  },
};

const HOVER_LIFT = {
  y: -5,
  transition: { type: "spring", stiffness: 220, damping: 22 },
} as const;

const tags = {
  div: m.div,
  section: m.section,
  p: m.p,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
};

type Tag = keyof typeof tags;

type BaseProps = {
  as?: Tag;
  className?: string;
  children: ReactNode;
};

type EffectProps = {
  effect?: Effect;
  from?: Side;
};

function triggerProps(trigger: "mount" | "view") {
  return trigger === "mount"
    ? { initial: "hidden", animate: "show" }
    : { initial: "hidden", whileInView: "show", viewport: VIEWPORT };
}

/**
 * Parent that reveals its <StaggerItem> / <AnimatedWords> children one after
 * another. Use trigger="mount" for above-the-fold content.
 */
export function Stagger({
  as = "div",
  className,
  children,
  trigger = "view",
  interval = 0.15,
  delay = 0.05,
}: BaseProps & {
  trigger?: "mount" | "view";
  interval?: number;
  delay?: number;
}) {
  const Component = tags[as] as typeof m.div;
  return (
    <Component
      className={className}
      variants={{
        hidden: {},
        show: {
          transition: { delayChildren: stagger(interval, { startDelay: delay }) },
        },
      }}
      {...triggerProps(trigger)}
    >
      {children}
    </Component>
  );
}

/** Child of <Stagger>. `hover` adds a spring lift for cards. */
export function StaggerItem({
  as = "div",
  className,
  children,
  effect = "rise",
  from = "start",
  hover = false,
}: BaseProps & EffectProps & { hover?: boolean }) {
  const Component = tags[as] as typeof m.div;
  return (
    <Component
      className={className}
      variants={useEffectVariants(effect, from)}
      whileHover={hover ? HOVER_LIFT : undefined}
    >
      {children}
    </Component>
  );
}

/** Standalone entrance for a single block when it scrolls into view. */
export function Reveal({
  as = "div",
  className,
  children,
  effect = "rise",
  from = "start",
  delay = 0,
}: BaseProps & EffectProps & { delay?: number }) {
  const Component = tags[as] as typeof m.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={useEffectVariants(effect, from, delay)}
    >
      {children}
    </Component>
  );
}

/**
 * Heading whose words rise in sequence. Must sit inside a <Stagger>. Splits
 * on spaces, so languages without them (e.g. Chinese) animate as one block;
 * word order and direction are left to the browser, so RTL is unaffected.
 */
export function AnimatedWords({
  text,
  as = "h1",
  className,
  interval = 0.09,
}: {
  text: string;
  as?: Tag;
  className?: string;
  interval?: number;
}) {
  const Component = tags[as] as typeof m.div;
  const words = text.split(" ");
  return (
    <Component
      className={className}
      variants={{
        hidden: {},
        show: { transition: { delayChildren: stagger(interval) } },
      }}
    >
      {words.map((w, i) => (
        // Plain space between spans (not inside) so the line can still wrap.
        <Fragment key={i}>
          <m.span variants={word} className="inline-block">
            {w}
          </m.span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Component>
  );
}

/** Subtle lift on hover and press feedback for buttons and links. */
export function Press({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <m.div
      className={`inline-flex ${className ?? ""}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {children}
    </m.div>
  );
}
