"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

// LazyMotion + `m` components keep the bundle small (domAnimation covers
// animate/whileInView/whileHover/whileTap). `strict` throws if a full
// `motion.*` component sneaks in and defeats that.
// reducedMotion="user": with the OS setting on, transforms are skipped and
// only opacity fades remain.
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
