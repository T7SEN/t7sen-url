// src/components/ui/spotlight-background.tsx
"use client";

import * as React from "react";
import {
  m as motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

// The cursor glow's radius: a 2x box with a closest-side gradient
const GLOW_RADIUS = 600;

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
  // Centre the glow's box on the cursor
  const glowX = useTransform(smoothX, (x) => x - GLOW_RADIUS);
  const glowY = useTransform(smoothY, (y) => y - GLOW_RADIUS);

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
      {/* The aurora: three soft colour fields in the logo's purple, blue and
          red, drifting on their own loops (CSS, globals.css), so the page
          moves without a cursor, on phones too. Gradients fade to transparent
          (no blur filter) and only transform animates, so it stays on the
          compositor. Sized in vmax to cover portrait and landscape alike.
          will-change only while motion is allowed: under reduced motion
          nothing moves and the three big layers would be wasted memory. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden animate-in fade-in duration-1000"
      >
        <div className="absolute -left-[22vmax] -top-[28vmax] size-[72vmax] animate-aurora-1 bg-[radial-gradient(closest-side,rgba(145,70,255,0.16),transparent)] motion-safe:will-change-transform dark:bg-[radial-gradient(closest-side,rgba(145,70,255,0.24),transparent)]" />
        <div className="absolute -right-[26vmax] -top-[18vmax] size-[62vmax] animate-aurora-2 bg-[radial-gradient(closest-side,rgba(59,130,246,0.12),transparent)] motion-safe:will-change-transform dark:bg-[radial-gradient(closest-side,rgba(59,130,246,0.16),transparent)]" />
        <div className="absolute -bottom-[34vmax] left-[8vmax] size-[66vmax] animate-aurora-3 bg-[radial-gradient(closest-side,rgba(239,68,68,0.08),transparent)] motion-safe:will-change-transform dark:bg-[radial-gradient(closest-side,rgba(239,68,68,0.12),transparent)]" />
        <div className="absolute inset-0 bg-grain opacity-[0.035] dark:opacity-[0.05]" />
      </div>

      {/* The cursor glow, over the aurora: a fixed circle moved by transform,
          so following the cursor only composites. Painting the gradient at
          the cursor (as before) repainted a full-viewport layer, grain
          included, on every frame. Promoted only where a mouse can move it. */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-0 size-[1200px] bg-[radial-gradient(closest-side,rgba(145,70,255,0.07),transparent_80%)] pointer-fine:will-change-transform"
        style={{ x: glowX, y: glowY }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
