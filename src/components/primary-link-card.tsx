// src/components/primary-link-card.tsx
"use client";

import * as React from "react";
import { type ProfileLink } from "@/config/profile";
import { usePostHog } from "posthog-js/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface PrimaryLinkCardProps {
  link: ProfileLink;
}

export const PrimaryLinkCard = ({ link }: PrimaryLinkCardProps) => {
  const posthog = usePostHog();
  const { title, url, icon: Icon, isFeatured } = link;

  const handleClick = () => {
    if (posthog) {
      posthog.capture("primary_link_clicked", {
        link_id: link.id,
        link_title: title,
        link_url: url,
      });
    }
  };

  if (isFeatured) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden rounded-[20px] px-6 py-5 shadow-xl transition-all duration-500 hover:scale-[1.02]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
          // Base States
          "bg-white/80 border border-zinc-200/50",
          "dark:bg-[#030303] dark:border-transparent",
          // Universal Hover State
          "hover:bg-[#030303] hover:border-transparent hover:shadow-[0_0_50px_-15px_rgba(145,70,255,0.5)]",
          "dark:hover:bg-[#030303] dark:hover:border-transparent dark:hover:shadow-[0_0_50px_-15px_rgba(145,70,255,0.5)]",
        )}
      >
        {/* 1. The Infinite Void (Cosmic Noise Background) */}
        <div
          className="absolute inset-0 z-0 opacity-0 mix-blend-screen transition-opacity duration-1000 group-hover:opacity-40"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.5%22/%3E%3C/svg%3E")',
          }}
        />

        {/* 2. Six Eyes Gaze (Subtle Cyan Idle State) */}
        <div className="absolute top-0 z-0 h-px w-3/4 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-30 blur-[2px] transition-opacity duration-500 group-hover:opacity-0 dark:via-cyan-400 dark:opacity-50" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent transition-opacity duration-500 group-hover:opacity-0 dark:from-cyan-900/20" />

        {/* --- THE HOLLOW PURPLE SEQUENCE --- */}
        <div className="absolute -left-[50%] top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-blue-600 blur-2xl transition-all duration-600 ease-in group-hover:left-1/2 group-hover:-translate-x-1/2 group-hover:opacity-0" />
        <div className="absolute -right-[50%] top-1/2 z-0 h-40 w-40 -translate-y-1/2 rounded-full bg-red-600 blur-2xl transition-all duration-600 ease-in group-hover:right-1/2 group-hover:translate-x-1/2 group-hover:opacity-0" />

        {/* 100% opacity blast on hover */}
        <div className="absolute left-1/2 top-1/2 z-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[#9146FF] opacity-0 blur-[50px] transition-all duration-700 ease-out group-hover:scale-[3] group-hover:opacity-100 group-hover:delay-[400ms]" />

        {/* --- FOREGROUND ELEMENTS --- */}
        <div className="relative z-10 flex flex-row items-center gap-5 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all duration-700 group-hover:delay-[400ms]",
              // Base states
              "border-cyan-500/30 bg-white/60 shadow-cyan-500/20",
              "dark:border-cyan-500/20 dark:bg-black/50 dark:shadow-[0_0_25px_rgba(6,182,212,0.15)]",
              // Hover Overrides
              "group-hover:border-white/40 group-hover:bg-white/10 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]",
              "dark:group-hover:border-white/40 dark:group-hover:bg-white/10 dark:group-hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]",
            )}
          >
            <Icon className="h-5 w-5 transition-colors duration-700 text-cyan-600 dark:text-cyan-300 group-hover:text-white dark:group-hover:text-white group-hover:delay-[400ms]" />
          </motion.div>

          <div className="relative grid items-center">
            {/* Light Mode Idle */}
            <span className="col-start-1 row-start-1 block bg-linear-to-b from-zinc-800 to-zinc-500 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent dark:hidden">
              {title}
            </span>

            {/* Dark Mode Idle */}
            <span className="col-start-1 row-start-1 hidden bg-linear-to-b from-zinc-100 to-zinc-500 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent dark:block">
              {title}
            </span>

            {/* Universal Hover (Hollow Purple) - Fades in strictly on schedule */}
            <span className="col-start-1 row-start-1 z-10 bg-linear-to-b from-white to-purple-100 bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-hover:delay-[400ms]">
              {title}
            </span>
          </div>
        </div>

        {/* Glassmorphic Boundary */}
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[20px] border border-black/5 transition-colors duration-700 group-hover:border-[#9146FF]/50 group-hover:delay-[400ms] dark:border-white/5 dark:group-hover:border-[#9146FF]/50" />
      </a>
    );
  }

  // Standard non-featured layout
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-200/50 bg-white/40 p-4 transition-all hover:scale-[1.02] hover:border-zinc-300 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950"
    >
      <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
      <span className="font-medium text-zinc-800 dark:text-zinc-200">
        {title}
      </span>
    </a>
  );
};
