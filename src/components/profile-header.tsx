// src/components/profile-header.tsx
"use client";

import Image from "next/image";
import { usePostHog } from "posthog-js/react";
import { profileData } from "@/config/profile";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useStreamStatus } from "@/components/stream-status-provider";

export function ProfileHeader() {
  const posthog = usePostHog();
  const { isLive } = useStreamStatus();
  const userInitials = profileData.name.slice(0, 2).toUpperCase();

  const handleLiveClick = () => {
    if (posthog) {
      posthog.capture("live_avatar_clicked", {
        channel: profileData.twitchChannel,
      });
    }

    logger.info("Live avatar clicked", {
      tags: { component: "ProfileHeader" },
    });
  };

  return (
    <header className="flex flex-col items-center gap-4 text-center short:gap-3">
      <div
        className={cn(
          "relative flex h-24 w-24 short:h-20 short:w-20 items-center justify-center rounded-full bg-linear-to-b from-[#9146FF] to-zinc-800 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-150 duration-700 dark:to-zinc-950",
          // Live: a thicker ring in the logo's colours, glowing, and the whole
          // avatar presses like the link it becomes
          isLive
            ? "p-[3px] shadow-[0_0_32px_-4px_rgba(145,70,255,0.6)] transition-transform has-[a:active]:scale-95"
            : "p-0.5 shadow-2xl",
        )}
      >
        {isLive && (
          // Fades in on its own layer: the spin and tw-animate-css's fade
          // would both set `animation` on one element
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-in fade-in duration-700"
          >
            <span className="absolute inset-0 animate-live-ring rounded-full bg-[conic-gradient(#ef4444,#9146FF,#3b82f6,#9146FF,#ef4444)]" />
          </span>
        )}

        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white dark:border-[#030303] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <span className="absolute text-xl font-bold text-zinc-500 dark:text-zinc-400">
            {userInitials}
          </span>
          <Image
            src={profileData.avatarUrl}
            alt={`${profileData.name} avatar`}
            fill
            loading="eager"
            fetchPriority="high"
            decoding="async"
            sizes="96px"
            className="object-cover relative z-10"
          />
        </div>

        {isLive && (
          // An overlay rather than wrapping the avatar in <a>: swapping the
          // element would remount the image when the status changes. Like a
          // story ring, tapping a live avatar opens the stream.
          <a
            href={profileData.twitchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLiveClick}
            aria-label={`Watch ${profileData.name} live on Twitch`}
            className="absolute inset-0 z-20 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950"
          >
            {/* white on red-600: 4.8:1 */}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in-50 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-black tracking-[0.15em] text-white uppercase ring-2 ring-white duration-500 dark:ring-[#030303]">
              Live
            </span>
          </a>
        )}
      </div>

      <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-300 duration-700">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl short:text-2xl">
          {profileData.name}
        </h1>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:text-base">
          {profileData.bio}
        </p>
      </div>
    </header>
  );
}
