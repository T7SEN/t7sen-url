// src/components/magnetic-wrapper.tsx
"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function MagneticWrapper({
  children,
  className = "",
}: MagneticWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Physics configuration for the magnetic snap
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();

    // Calculate distance from the center of the element
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    // 0.2 is the "strength" of the magnet. 20% pull towards cursor.
    x.set(middleX * 0.2);
    y.set(middleY * 0.2);
  };

  const handleMouseLeave = () => {
    // Snap back to original position
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
