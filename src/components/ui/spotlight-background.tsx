// src/components/ui/spotlight-background.tsx
"use client";

import * as React from "react";
import {
  m as motion,
  useMotionTemplate,
  useMotionValue,
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

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    // Attach globally so it tracks regardless of z-index stacking
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col overflow-hidden antialiased transition-colors duration-300",
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

      {/* The Static Grid Layer */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />

      {/* The Ambient Spotlight Beams */}
      <Spotlight />

      {/* Content layer */}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
