// src/components/magnetic-wrapper.tsx
"use client";

import * as React from "react";
import {
  m as motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function MagneticWrapper({
  children,
  className = "",
}: MagneticWrapperProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  // Page coordinates so the cached centre survives document scroll
  const boundsRef = React.useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  // MotionConfig's reducedMotion doesn't cover pointer-driven springs
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // 🚀 React Compiler automatically memoizes these handlers at build time
  const handleMouseEnter = () => {
    if (ref.current) {
      // Cache geometry once on enter to prevent layout thrashing
      const rect = ref.current.getBoundingClientRect();
      boundsRef.current = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !boundsRef.current) return;

    const { pageX, pageY } = e;
    // Read from memory cache instead of the DOM
    const { height, width, left, top } = boundsRef.current;

    const middleX = pageX - (left + width / 2);
    const middleY = pageY - (top + height / 2);

    x.set(middleX * 0.2);
    y.set(middleY * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    // Clear cache to prevent stale positioning if the window resizes
    boundsRef.current = null;
  };

  return (
    <motion.div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        x: springX,
        y: springY,
        willChange: "transform",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
