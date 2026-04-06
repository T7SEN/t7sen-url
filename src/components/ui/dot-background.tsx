// src/components/ui/dot-background.tsx
import { cn } from "@/lib/utils";
import * as React from "react";

interface DotBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function DotBackground({ children, className }: DotBackgroundProps) {
  return (
    <div
      className={cn(
        // We use min-h-screen instead of fixed h-[50rem] to ensure it covers all content
        "relative flex min-h-screen w-full flex-col bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300",
        className,
      )}
    >
      {/* The dotted pattern layer */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          "[background-size:20px_20px]",
          "[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]",
        )}
      />

      {/* Radial gradient mask to give a faded look at the edges/center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-zinc-950 transition-colors duration-300" />

      {/* Content layer (z-10 ensures it sits above the background) */}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
