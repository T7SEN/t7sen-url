// src/components/ui/spotlight-background.tsx
"use client";

import * as React from "react";
import {
  m as motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { Spotlight } from "@/components/ui/spotlight-new";
import { cn } from "@/lib/utils";

interface SpotlightBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightBackground({
  children,
  className,
}: SpotlightBackgroundProps) {
  // 🚀 GPU-Bound Coordinate Trackers
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Physics-based smoothing for the cursor tracking
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20, mass: 0.5 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20, mass: 0.5 });

  // With reduced motion the glow stays put instead of following the cursor.
  // Gated in the effect (not in render) so server and client markup match.
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    // Attach globally so it tracks regardless of z-index stacking
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, reduceMotion]);

  return (
    <div
      className={cn(
        // min-h-dvh: min-h-screen (100vh) adds phantom scroll under mobile toolbars
        "relative flex min-h-dvh w-full flex-col overflow-hidden antialiased transition-colors duration-300",
        "bg-white dark:bg-black/96",
        className,
      )}
    >
      {/* 🚀 The Dynamic GPU Tracking Glow */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`
						radial-gradient(
							600px circle at ${smoothX}px ${smoothY}px,
							rgba(145, 70, 255, 0.07),
							transparent 80%
						)
					`,
          willChange: "background",
        }}
      />

      {/* The Ambient Spotlight Beams, tinted to the brand violet (the
          component's default is a pale blue) */}
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(265, 100%, 85%, .08) 0, hsla(265, 100%, 60%, .02) 50%, hsla(265, 100%, 50%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(265, 100%, 85%, .06) 0, hsla(265, 100%, 60%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(265, 100%, 85%, .04) 0, hsla(265, 100%, 50%, .02) 80%, transparent 100%)"
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
