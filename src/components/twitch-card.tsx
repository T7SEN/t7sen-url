// src/components/twitch-card.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import {
  m as motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
} from "motion/react";
import { Icons } from "@/components/icons";
import { profileData } from "@/config/profile";
import { usePostHog } from "posthog-js/react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { logger } from "@/lib/logger";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TwitchCard() {
  const posthog = usePostHog();
  const channel = profileData.twitchChannel;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const boundsRef = React.useRef<DOMRect | null>(null);

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      boundsRef.current = e.currentTarget.getBoundingClientRect();
    },
    [],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!boundsRef.current) return;
      const { left, top } = boundsRef.current;
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = React.useCallback(() => {
    boundsRef.current = null;
  }, []);

  const { data, error } = useSWR(`/api/twitch?channel=${channel}`, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  React.useEffect(() => {
    if (error) {
      logger.error(error, {
        tags: { component: "TwitchCard", issue: "swr_fetch_failed" },
      });
    }
  }, [error]);

  let isLive: boolean | null = null;

  if (error) {
    isLive = false;
  } else if (data !== undefined) {
    isLive = data.isLive === true;
  }

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

    logger.info("Twitch card clicked", {
      tags: { component: "TwitchCard" },
      extra: { channel, isLive },
    });
  };

  if (isLive === null) {
    return (
      <div className="w-full animate-pulse">
        <div className="group relative block w-full overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/60 shadow-xl dark:border-zinc-800/50 dark:bg-[#030303]">
          <div className="relative h-32 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-900">
            <Image
              src={profileData.bannerUrl}
              alt={`${channel} Twitch Banner`}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover opacity-30 grayscale dark:opacity-20"
              priority
              fetchPriority="high"
            />
          </div>
          <div className="relative -mt-5 flex flex-col items-center px-6 pb-6 text-center">
            <div className="mb-4 h-7 w-24 rounded-full bg-zinc-300 dark:bg-zinc-800" />
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-zinc-300 dark:bg-zinc-800" />
                <div className="space-y-2 text-left">
                  <div className="h-5 w-28 rounded-md bg-zinc-300 dark:bg-zinc-800" />
                  <div className="h-4 w-40 rounded-md bg-zinc-200 dark:bg-zinc-900" />
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-300 dark:bg-zinc-800" />
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
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={cn(
          "group relative block w-full overflow-hidden rounded-3xl border transition-all duration-500 hover:scale-[1.02]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
          isLive
            ? "border-[#9146FF]/40 bg-white/60 shadow-[0_0_40px_-10px_rgba(145,70,255,0.2)] hover:border-[#9146FF] hover:shadow-[0_0_60px_-10px_rgba(145,70,255,0.4)] dark:bg-[#030303] dark:shadow-[0_0_40px_-10px_rgba(145,70,255,0.3)] dark:hover:shadow-[0_0_60px_-10px_rgba(145,70,255,0.5)]"
            : "border-zinc-200/50 bg-white/60 shadow-xl hover:border-zinc-300 hover:shadow-2xl dark:border-zinc-800/50 dark:bg-[#030303] dark:hover:border-zinc-700",
        )}
      >
        <div className="relative h-32 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          <Image
            src={profileData.bannerUrl}
            alt={`${channel} Twitch Banner`}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className={cn(
              "object-cover transition-all duration-1000 ease-out",
              isLive
                ? "scale-105 opacity-50 group-hover:scale-110 group-hover:opacity-70 dark:opacity-50"
                : "scale-100 opacity-30 grayscale group-hover:opacity-50 group-hover:grayscale-0 dark:opacity-20 dark:group-hover:opacity-30",
            )}
            priority
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-linear-to-t from-white/60 via-transparent to-transparent dark:from-[#030303]" />
        </div>

        <motion.div
          className="pointer-events-none absolute inset-0 z-10 hidden opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100 dark:block"
          style={{ background: glareBackground }}
        />

        <div className="relative z-20 -mt-5 flex flex-col items-center px-6 pb-6 text-center">
          <div className="mb-5 h-7">
            <AnimatePresence mode="wait">
              {isLive ? (
                <motion.div
                  key="live"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="group/badge relative flex items-center gap-2.5 rounded-full border border-red-500/30 bg-white/80 px-5 py-1.5 shadow-md backdrop-blur-md dark:bg-red-500/10 dark:shadow-none"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)] dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    Live Now
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 shadow-sm backdrop-blur-md transition-colors group-hover:border-zinc-300 group-hover:text-zinc-700 dark:border-zinc-700/50 dark:bg-zinc-800/60 dark:text-zinc-500 dark:shadow-none dark:group-hover:border-zinc-600 dark:group-hover:text-zinc-400"
                >
                  Offline
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md transition-all duration-500 group-hover:scale-110",
                  isLive
                    ? "border-[#9146FF]/30 bg-white/80 text-[#9146FF] shadow-[0_0_20px_rgba(145,70,255,0.2)] group-hover:bg-[#9146FF] group-hover:text-white dark:border-[#9146FF]/50 dark:bg-[#9146FF]/20 dark:shadow-[0_0_20px_rgba(145,70,255,0.4)]"
                    : "border-zinc-200 bg-white text-zinc-500 shadow-sm group-hover:border-zinc-300 group-hover:bg-zinc-50 group-hover:text-zinc-700 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-400 dark:shadow-none dark:group-hover:border-zinc-600 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200",
                )}
              >
                <Icons.twitch className="relative z-10 h-7 w-7 transition-transform duration-500 group-hover:-rotate-12" />
              </div>

              <div className="text-left">
                <h2 className="text-xl font-black tracking-tight text-zinc-900 transition-colors duration-300 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-white">
                  {channel}
                </h2>
                <p className="text-sm font-medium text-zinc-500 transition-colors duration-300 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                  {profileData.twitchTagline}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 group-hover:-rotate-45",
                isLive
                  ? "border-[#9146FF]/20 bg-white/50 text-[#9146FF] group-hover:border-[#9146FF]/40 group-hover:bg-[#9146FF]/10 dark:border-[#9146FF]/30 dark:bg-[#9146FF]/10 dark:group-hover:border-[#9146FF]/50 dark:group-hover:bg-[#9146FF]/20"
                  : "border-zinc-200 bg-zinc-50 text-zinc-400 group-hover:border-zinc-300 group-hover:bg-zinc-100 group-hover:text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-500 dark:group-hover:border-zinc-600 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-300",
              )}
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
