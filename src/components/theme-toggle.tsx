// src/components/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import posthog from "posthog-js";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Theme = "light" | "dark";

// The newest reveal: a toggle during a running one skips the old transition,
// whose cleanup must then leave the new one's settings alone
let activeTransition: ViewTransition | null = null;
// The theme a click asked for until the page shows it: a View Transition
// captures the old page before it switches anything, so a quick second click
// would otherwise read the old theme and pick the same one again
let pendingTheme: Theme | null = null;

// Switch now, not after React re-renders (next-themes applies the class in an
// effect): a View Transition captures the new page as soon as its callback
// returns. Transitions are off while the styles flush, so the page shows its
// final colours at once instead of fading from the old ones (next-themes' own
// disableTransitionOnChange never forces that flush).
function applyTheme(theme: Theme, setTheme: (theme: string) => void) {
  const root = document.documentElement;
  const noTransitions = document.createElement("style");
  noTransitions.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(noTransitions);
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  document.body.getBoundingClientRect();
  noTransitions.remove();
  if (pendingTheme === theme) pendingTheme = null;
  // State and localStorage; its effect then re-applies the same class
  setTheme(theme);
}

export function ThemeToggle() {
  const { setTheme } = useTheme();

  // 🚀 useCallback removed: React Compiler handles this automatically
  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    // The class on <html> is the theme on screen ("system" already resolved
    // to light/dark); resolvedTheme lags it until React re-renders
    const current: Theme =
      pendingTheme ??
      (document.documentElement.classList.contains("dark") ? "dark" : "light");
    const newTheme: Theme = current === "dark" ? "light" : "dark";
    pendingTheme = newTheme;

    posthog.capture("theme_toggled", { theme: newTheme });

    logger.info("User toggled application theme", {
      tags: { component: "ThemeToggle" },
      extra: { previousTheme: current, newTheme },
    });

    // No circular reveal without View Transitions or when the OS asks for reduced motion
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      applyTheme(newTheme, setTheme);
      return;
    }

    // From the pointer, or the button's centre for keyboard presses (a click
    // with detail 0 has no coordinates)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.detail > 0 ? e.clientX : rect.left + rect.width / 2;
    const y = e.detail > 0 ? e.clientY : rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // The reveal itself is CSS (globals.css), keyed on these
    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);
    root.dataset.themeSwitch = newTheme === "dark" ? "to-dark" : "to-light";

    // While a transition runs the browser hit-tests the transition root, so
    // the button loses :hover: the reveal (centred on it) would uncover it
    // unhovered, then it would grow back to hover at the end. data-switching
    // holds the hover look meanwhile (set before the capture, so the new
    // page has it); keyboard presses never hovered it.
    const button = e.currentTarget;
    if (e.detail > 0) button.dataset.switching = "";

    const transition = document.startViewTransition(() =>
      applyTheme(newTheme, setTheme),
    );
    activeTransition = transition;

    // Rejects when a newer toggle skips this one: nothing to report
    transition.ready.catch(() => {});
    transition.finished.finally(() => {
      // Normally cleared by applyTheme; never leave it stuck
      if (pendingTheme === newTheme) pendingTheme = null;
      // :hover returns a frame or so after the transition ends: hand over
      // then, so no frame shows the button unhovered
      requestAnimationFrame(() =>
        requestAnimationFrame(() => delete button.dataset.switching),
      );
      if (activeTransition !== transition) return;
      activeTransition = null;
      delete root.dataset.themeSwitch;
      root.style.removeProperty("--theme-x");
      root.style.removeProperty("--theme-y");
      root.style.removeProperty("--theme-r");
    });
  };

  return (
    // Same box, hover and press as the share button and the social icons
    <button
      type="button"
      onClick={toggleTheme}
      title="Toggle theme"
      className={cn(
        "group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 sm:h-12 sm:w-12",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
        "border-transparent bg-transparent text-zinc-500 hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50",
        // The hover look, held through a pointer-started reveal (see above)
        "data-switching:scale-110 data-switching:border-zinc-200/50 data-switching:bg-white/60 data-switching:text-zinc-900 data-switching:shadow-sm dark:data-switching:border-zinc-800/50 dark:data-switching:bg-zinc-900/60 dark:data-switching:text-zinc-50",
      )}
    >
      {/* 18px, stroke 2.5: the share button's icon metrics */}
      <Sun
        aria-hidden="true"
        strokeWidth={2.5}
        className="size-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      />
      <Moon
        aria-hidden="true"
        strokeWidth={2.5}
        className="absolute size-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
