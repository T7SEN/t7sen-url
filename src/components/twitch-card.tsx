// src/components/twitch-card.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Icons } from "@/components/icons";
import { profileData } from "@/config/profile";
import posthog from "posthog-js";

export function TwitchCard() {
  const [isLive, setIsLive] = React.useState<boolean | null>(null);
  const channel = profileData.twitchChannel;

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

  // SKELETON LOADER: Prevents layout shift by reserving the exact space
  if (isLive === null) {
    return (
      <div className="w-full animate-pulse">
        <div className="group relative block w-full overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/50 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/50">
          {/* Skeleton Banner Area */}
          <div className="h-28 w-full bg-zinc-200 dark:bg-zinc-800" />

          {/* Skeleton Card Body */}
          <div className="relative -mt-6 flex flex-col items-center px-6 pb-6 text-center">
            {/* Skeleton Badge */}
            <div className="mb-4 h-6 w-20 rounded-full bg-zinc-300 dark:bg-zinc-700" />

            {/* Skeleton Channel Info Row */}
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-zinc-300 dark:bg-zinc-700" />
                <div className="space-y-2 text-left">
                  <div className="h-5 w-24 rounded-md bg-zinc-300 dark:bg-zinc-700" />
                  <div className="h-4 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        className="group relative block w-full overflow-hidden rounded-3xl border border-zinc-200/50 bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-[#9146FF]/50 hover:shadow-[#9146FF]/10 dark:border-zinc-800/50 dark:bg-zinc-950 dark:hover:shadow-[#9146FF]/10"
        onClick={() =>
          posthog.capture("twitch_card_clicked", {
            channel,
            is_live: isLive,
          })
        }
      >
        {/* Top Banner Area */}
        <div className="relative h-28 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={profileData.bannerUrl}
            alt={`${channel} Twitch Banner`}
            fill
            className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-80 dark:opacity-40 dark:group-hover:opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-zinc-950" />
        </div>

        {/* Card Body & Content */}
        <div className="relative -mt-6 flex flex-col items-center px-6 pb-6 text-center">
          {/* Floating Live Badge */}
          <div className="mb-4 h-6">
            <AnimatePresence mode="wait">
              {isLive ? (
                <motion.div
                  key="live"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/30 ring-4 ring-white dark:ring-zinc-950"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>
                  Live Now
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 ring-4 ring-white dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-950"
                >
                  Offline
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Channel Info & Branding */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9146FF] text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                <Icons.twitch className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
                  {channel}
                </h3>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {profileData.twitchTagline}
                </p>
              </div>
            </div>

            {/* Arrow Indicator */}
            <div className="rounded-full bg-zinc-100 p-2 text-zinc-400 transition-colors group-hover:bg-[#9146FF]/10 group-hover:text-[#9146FF] dark:bg-zinc-900 dark:text-zinc-500">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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

        <div
          className={`absolute inset-0 -z-10 bg-[#9146FF]/0 transition-colors duration-300 group-hover:bg-[#9146FF]/5 ${isLive ? "bg-[#9146FF]/5" : ""}`}
        />
      </a>
    </motion.div>
  );
}
