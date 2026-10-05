// src/components/primary-link-card.tsx
"use client";

import * as React from "react";
import { type ProfileLink } from "@/config/profile";
import { usePostHog } from "posthog-js/react";
import { m as motion } from "motion/react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface PrimaryLinkCardProps {
  link: ProfileLink;
}

// The featured card's touch-screen reveal: starts once the CSS entrance
// (delay-500 + duration-700) has finished, then holds before easing back
const REVEAL_START_MS = 900;
const REVEAL_HOLD_MS = 2800;

export const PrimaryLinkCard = ({ link }: PrimaryLinkCardProps) => {
  const posthog = usePostHog();
  const { title, url, icon: Icon, isFeatured } = link;
  const cardRef = React.useRef<HTMLAnchorElement>(null);
  const [revealed, setRevealed] = React.useState(false);

  // Touch screens never hover, so they never saw the featured card's reveal:
  // play it once when the card is in view. Pointer devices keep it on hover.
  React.useEffect(() => {
    const card = cardRef.current;
    if (!isFeatured || !card) return;
    if (
      !window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        startTimer = setTimeout(() => {
          setRevealed(true);
          endTimer = setTimeout(() => setRevealed(false), REVEAL_HOLD_MS);
        }, REVEAL_START_MS);
      },
      { threshold: 0.75 },
    );
    observer.observe(card);

    return () => {
      observer.disconnect();
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [isFeatured]);

  const handleClick = () => {
    if (posthog) {
      posthog.capture("primary_link_clicked", {
        link_id: link.id,
        link_title: title,
        link_url: url,
      });
    }

    logger.info("Primary link clicked", {
      tags: { component: "PrimaryLinkCard", linkId: link.id },
    });
  };

  if (isFeatured) {
    return (
      <a
        ref={cardRef}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        data-reveal={revealed ? "" : undefined}
        className={cn(
          // CSS entrance (tw-animate-css)
          "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-500 duration-700",
          // reveal: = hover, or the one-time touch-screen reveal (globals.css).
          // active: a quick press, without the entrance's 500 ms delay;
          // important because reveal: rules come later in the CSS and would
          // keep the hover scale while pressed
          "group/featured relative flex w-full items-center justify-center overflow-hidden rounded-[20px] px-6 py-5 shadow-xl transition-all reveal:scale-[1.02] active:scale-[0.98]! active:delay-0 active:duration-150 short:py-4",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
          "bg-white/80 border border-zinc-200/50",
          "dark:bg-[#030303] dark:border-transparent",
          "reveal:bg-[#030303] reveal:border-transparent reveal:shadow-[0_0_50px_-15px_rgba(145,70,255,0.5)]",
          "dark:reveal:bg-[#030303] dark:reveal:border-transparent dark:reveal:shadow-[0_0_50px_-15px_rgba(145,70,255,0.5)]",
        )}
      >
        <div
          className="absolute inset-0 z-0 opacity-0 mix-blend-screen transition-opacity duration-1000 reveal:opacity-40"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.5%22/%3E%3C/svg%3E")',
          }}
        />

        {/* Accents follow the logo's red → purple → blue (src/app/icon.svg) */}
        <div className="absolute top-0 z-0 h-px w-3/4 bg-linear-to-r from-transparent via-[#9146FF] to-transparent opacity-40 blur-[2px] transition-opacity duration-500 reveal:opacity-0 dark:via-violet-400 dark:opacity-50" />
        <div className="absolute inset-0 z-0 bg-radial-[ellipse_at_top] from-violet-500/10 via-transparent to-transparent transition-opacity duration-500 reveal:opacity-0 dark:from-violet-900/25" />

        {/* Parked a fixed 14rem outside (not -50%, which left their blurred
            edges showing on narrow phone cards) until the reveal pulls them in */}
        <div className="absolute -left-56 top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-blue-600 blur-2xl transition-all duration-600 ease-in reveal:left-1/2 reveal:-translate-x-1/2 reveal:opacity-0" />
        <div className="absolute -right-56 top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-red-600 blur-2xl transition-all duration-600 ease-in reveal:right-1/2 reveal:translate-x-1/2 reveal:opacity-0" />

        <div className="absolute left-1/2 top-1/2 z-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[#9146FF] opacity-0 blur-[50px] transition-all duration-700 ease-out reveal:scale-[3] reveal:opacity-100 reveal:delay-[400ms]" />

        <div className="relative z-10 flex flex-row items-center gap-5 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all duration-700 reveal:delay-[400ms]",
              "border-violet-500/30 bg-white/60 shadow-violet-500/20",
              "dark:border-violet-500/25 dark:bg-black/50 dark:shadow-[0_0_25px_rgba(145,70,255,0.2)]",
              "reveal:border-white/40 reveal:bg-white/10 reveal:shadow-[0_0_40px_rgba(255,255,255,0.4)]",
              "dark:reveal:border-white/40 dark:reveal:bg-white/10 dark:reveal:shadow-[0_0_40px_rgba(255,255,255,0.4)]",
            )}
          >
            <Icon className="h-5 w-5 transition-colors duration-700 text-violet-600 dark:text-violet-300 reveal:text-white dark:reveal:text-white reveal:delay-[400ms]" />
          </motion.div>

          <div className="relative grid items-center">
            <span className="col-start-1 row-start-1 block bg-linear-to-b from-zinc-800 to-zinc-500 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent dark:hidden">
              {title}
            </span>

            <span className="col-start-1 row-start-1 hidden bg-linear-to-b from-zinc-100 to-zinc-500 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent dark:block">
              {title}
            </span>

            <span className="col-start-1 row-start-1 z-10 bg-linear-to-b from-white to-purple-100 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent opacity-0 transition-opacity duration-700 reveal:opacity-100 reveal:delay-[400ms]">
              {title}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 rounded-[20px] border border-black/5 transition-colors duration-700 reveal:border-[#9146FF]/50 reveal:delay-[400ms] dark:border-white/5 dark:reveal:border-[#9146FF]/50" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      // CSS entrance (tw-animate-css)
      className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-500 duration-700 flex w-full items-center gap-3 rounded-xl border border-zinc-200/50 bg-white/40 p-4 transition-all hover:scale-[1.02] active:scale-[0.98] active:delay-0 active:duration-150 hover:border-zinc-300 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950"
    >
      <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
      <span className="font-medium text-zinc-800 dark:text-zinc-200">
        {title}
      </span>
    </a>
  );
};
