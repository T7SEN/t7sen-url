// src/components/magnetic-wrapper.tsx
"use client";

import * as React from "react";
import { m as motion, useMotionValue, useSpring } from "motion/react";

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function MagneticWrapper({
  children,
  className = "",
}: MagneticWrapperProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const boundsRef = React.useRef<DOMRect | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // 🚀 React Compiler automatically memoizes these handlers at build time
  const handleMouseEnter = () => {
    if (ref.current) {
      // Cache geometry once on enter to prevent layout thrashing
      boundsRef.current = ref.current.getBoundingClientRect();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boundsRef.current) return;

    const { clientX, clientY } = e;
    // Read from memory cache instead of the DOM
    const { height, width, left, top } = boundsRef.current;

    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

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
