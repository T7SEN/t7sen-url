// src/components/motion-provider.tsx
"use client";

import * as React from "react";
import { LazyMotion } from "motion/react";

const loadFeatures = () =>
  import("motion/react").then((res) => res.domAnimation);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
