// src/components/twitch-card.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
} from "motion/react";
import { Icons } from "@/components/icons";
import { profileData } from "@/config/profile";
import { usePostHog } from "posthog-js/react";

export function TwitchCard() {
  const posthog = usePostHog();
  const [isLive, setIsLive] = React.useState<boolean | null>(null);
  const channel = profileData.twitchChannel;

  // --- 1. ALL HOOKS DECLARED AT THE TOP LEVEL ---

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY],
  );

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/twitch?channel=${channel}`);
        const data = await res.json();
        setIsLive(!!data.isLive);
      } catch {
        setIsLive(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [channel]);

  // The Interactive Glass Glare Hook
  const glareBackground = useMotionTemplate`
		radial-gradient(
			350px circle at ${mouseX}px ${mouseY}px,
			rgba(255, 255, 255, 0.12),
			transparent 80%
		)
	`;

  const handleClick = () => {
    if (posthog) {
      posthog.capture("twitch_card_clicked", {
        channel,
        is_live: isLive,
      });
    }
  };

  // --- 2. SKELETON LOADER (Matches Original Big Layout) ---
  if (isLive === null) {
    return (
      <div className="w-full animate-pulse">
        <div className="group relative block w-full overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#030303] shadow-xl">
          {/* Tall Skeleton Banner */}
          <div className="h-32 w-full bg-zinc-900" />

          {/* Skeleton Body */}
          <div className="relative -mt-5 flex flex-col items-center px-6 pb-6 text-center">
            <div className="mb-4 h-7 w-24 rounded-full bg-zinc-800" />
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-zinc-800" />
                <div className="space-y-2 text-left">
                  <div className="h-5 w-28 rounded-md bg-zinc-800" />
                  <div className="h-4 w-40 rounded-md bg-zinc-900" />
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. THE MAIN RENDER (HERO VANGUARD) ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <a
        href={`https://twitch.tv/${channel}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className={`group relative block w-full overflow-hidden rounded-3xl border transition-all duration-500 hover:scale-[1.02] ${
          isLive
            ? "border-[#9146FF]/40 shadow-[0_0_40px_-10px_rgba(145,70,255,0.3)] hover:border-[#9146FF] hover:shadow-[0_0_60px_-10px_rgba(145,70,255,0.5)]"
            : "border-zinc-800/50 shadow-xl hover:border-zinc-700 hover:shadow-2xl"
        } bg-[#030303]`}
      >
        {/* 1. Tall Banner Area (Original Height Restored & Increased Slightly) */}
        <div className="relative h-32 w-full overflow-hidden bg-zinc-950">
          <Image
            src={profileData.bannerUrl}
            alt={`${channel} Twitch Banner`}
            fill
            className={`object-cover transition-all duration-1000 ease-out ${
              isLive
                ? "scale-105 opacity-50 group-hover:scale-110 group-hover:opacity-70"
                : "scale-100 opacity-20 grayscale group-hover:opacity-30 group-hover:grayscale-0"
            }`}
            priority
          />
          {/* Dark fade up into the banner */}
          <div className="absolute inset-0 bg-linear-to-t from-[#030303] via-transparent to-transparent" />
        </div>

        {/* 2. Interactive Glass Glare (Tracks Cursor) */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glareBackground }}
        />

        {/* 3. The Content Body (Original Stacked Layout) */}
        <div className="relative z-20 -mt-5 flex flex-col items-center px-6 pb-6 text-center">
          {/* Overlapping Status Badge */}
          <div className="mb-5 h-7">
            <AnimatePresence mode="wait">
              {isLive ? (
                <motion.div
                  key="live"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="group/badge relative flex items-center gap-2.5 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-1.5 backdrop-blur-md"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    Live Now
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/60 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 backdrop-blur-md transition-colors group-hover:border-zinc-600 group-hover:text-zinc-400"
                >
                  Offline
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Channel Info Row */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md transition-all duration-500 group-hover:scale-110 ${
                  isLive
                    ? "border-[#9146FF]/50 bg-[#9146FF]/20 text-[#9146FF] shadow-[0_0_20px_rgba(145,70,255,0.4)] group-hover:bg-[#9146FF] group-hover:text-white"
                    : "border-zinc-700/50 bg-zinc-800/50 text-zinc-400 group-hover:border-zinc-600 group-hover:bg-zinc-700 group-hover:text-zinc-200"
                }`}
              >
                <Icons.twitch className="relative z-10 h-7 w-7 transition-transform duration-500 group-hover:-rotate-12" />
              </div>

              <div className="text-left">
                <h3 className="text-xl font-black tracking-tight text-zinc-50 transition-colors duration-300 group-hover:text-white">
                  {channel}
                </h3>
                <p className="text-sm font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">
                  {profileData.twitchTagline}
                </p>
              </div>
            </div>

            {/* Action Arrow */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 group-hover:-rotate-45 ${
                isLive
                  ? "border-[#9146FF]/30 bg-[#9146FF]/10 text-[#9146FF] group-hover:border-[#9146FF]/50 group-hover:bg-[#9146FF]/20"
                  : "border-zinc-800 bg-zinc-800/50 text-zinc-500 group-hover:border-zinc-600 group-hover:bg-zinc-700 group-hover:text-zinc-300"
              }`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
              >
                <path
                  d="M6.1584 3.13508C6.35985 2.95662 6.66436 2.97484 6.84283 3.1763L10.3428 7.1763C10.5053 7.36195 10.5053 7.63805 10.3428 7.8237L6.84283 11.8237C6.66436 12.0252 6.35985 12.0434 6.1584 11.8649C5.95694 11.6865 5.93872 11.382 6.11718 11.1805L9.27878 7.5L6.11718 3.81949C5.93872 3.61803 5.95694 3.31353 6.1584 3.13508Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
          </div>
        </div>
      </a>
    </motion.div>
  );
}
