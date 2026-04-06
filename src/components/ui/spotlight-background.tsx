// src/components/ui/spotlight-background.tsx
import * as React from "react";
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
  return (
    <div
      className={cn(
        // Base structural classes
        "relative flex min-h-screen w-full flex-col overflow-hidden antialiased transition-colors duration-300",

        // Dark mode: Uses the exact styling from your snippet
        "dark:bg-black/[0.96] dark:bg-grid-white/[0.02]",

        // Light mode fallback: Clean white with a subtle dark grid
        "bg-white bg-grid-black/[0.02]",

        className,
      )}
    >
      {/* The ambient spotlight effect */}
      <Spotlight />

      {/* Content layer: z-10 ensures it sits above the spotlight and grid */}
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
