// src/components/motion-provider.tsx
"use client";

import * as React from "react";
import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () =>
  import("motion/react").then((res) => res.domAnimation);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user": honour the OS "reduce motion" setting by skipping
    // transform animations (the featured-card bob, badge scales).
    // Pointer-driven springs (MagneticWrapper, SpotlightBackground) check
    // useReducedMotion themselves.
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
