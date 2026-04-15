// src/components/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import { logger } from "@/lib/logger";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // 🚀 useCallback removed: React Compiler handles this automatically
  const toggleTheme = (e: React.MouseEvent) => {
    const newTheme = theme === "light" ? "dark" : "light";
    const isDark = theme === "dark";

    posthog.capture("theme_toggled", { theme: newTheme });

    logger.info("User toggled application theme", {
      tags: { component: "ThemeToggle" },
      extra: { previousTheme: theme, newTheme },
    });

    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    transition.ready
      .then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        document.documentElement.animate(
          {
            clipPath: isDark ? [...clipPath].reverse() : clipPath,
          },
          {
            duration: 500,
            easing: "ease-in-out",
            pseudoElement: isDark
              ? "::view-transition-old(root)"
              : "::view-transition-new(root)",
            fill: "forwards",
          },
        );
      })
      .catch((err) => {
        logger.error("View transition failed", { extra: { error: err } });
      });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="absolute top-4 right-4 h-10 w-10 rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
