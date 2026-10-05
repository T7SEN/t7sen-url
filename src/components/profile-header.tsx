// src/components/profile-header.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { usePostHog } from "posthog-js/react";
import { profileData } from "@/config/profile";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useStreamStatus } from "@/components/stream-status-provider";

// The name "decodes" from random glyphs, locking in left to right
const DECODE_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@";
const DECODE_FRAME_MS = 45;
// Per character: 5 x 130 ms fits the name's 700 ms fade-in
const DECODE_LOCK_MS = 130;
// The name block's delay-300 (keep in sync): the load-time decode starts then
const NAME_ENTRANCE_DELAY_MS = 300;
// Only on a fresh load: past this (slow hydration) the name has already been
// on screen, and scrambling it then would read as a glitch, not an entrance
const DECODE_LATEST_START_MS = 1200;

type DecodeTimer = React.RefObject<ReturnType<typeof setInterval> | undefined>;

function startDecode(
  setScrambled: (text: string | null) => void,
  timerRef: DecodeTimer,
) {
  clearInterval(timerRef.current);
  const name = profileData.name;
  const start = performance.now();
  timerRef.current = setInterval(() => {
    const locked = Math.floor((performance.now() - start) / DECODE_LOCK_MS);
    if (locked >= name.length) {
      clearInterval(timerRef.current);
      setScrambled(null);
      return;
    }
    setScrambled(
      Array.from(name, (char, i) =>
        i < locked || char === " "
          ? char
          : DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)],
      ).join(""),
    );
  }, DECODE_FRAME_MS);
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ProfileHeader() {
  const posthog = usePostHog();
  const { isLive } = useStreamStatus();
  const userInitials = profileData.name.slice(0, 2).toUpperCase();

  // The scrambled text while decoding, else null. It is drawn over the real
  // name, which stays in the DOM and only turns transparent meanwhile: the
  // server HTML, screen readers (aria-hidden overlay), selection and copy
  // (pointer-events-none select-none overlay) all only get "T7SEN".
  const [scrambled, setScrambled] = React.useState<string | null>(null);
  const decodeTimerRef = React.useRef<ReturnType<typeof setInterval>>(
    undefined,
  );
  const nameBlockRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    // Start as the name's fade-in starts: its delay counts from first paint,
    // and hydration usually lands inside it, so wait out what is left (the
    // entrance is gone from getAnimations() once finished)
    const entrance = nameBlockRef.current?.getAnimations()[0];
    const wait = entrance
      ? Math.max(0, NAME_ENTRANCE_DELAY_MS - Number(entrance.currentTime ?? 0))
      : 0;
    if (performance.now() + wait > DECODE_LATEST_START_MS) return;
    const startTimer = setTimeout(
      () => startDecode(setScrambled, decodeTimerRef),
      wait,
    );
    return () => clearTimeout(startTimer);
  }, []);

  // The latest timer (a hover may have restarted it), on unmount
  React.useEffect(() => () => clearInterval(decodeTimerRef.current), []);

  // Pointer devices can replay it by hovering the name itself
  const handleNamePointerEnter = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    startDecode(setScrambled, decodeTimerRef);
  };

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
          // 112px where there is height to spare: md+ outside the short:
          // band (short: also starts at md). Narrower screens keep 96 and
          // short laptops 80, so nothing scrolls that didn't before.
          "relative flex h-24 w-24 md:h-28 md:w-28 short:h-20 short:w-20 items-center justify-center rounded-full bg-linear-to-b from-[#9146FF] to-zinc-800 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-150 duration-700 dark:to-zinc-950",
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
            sizes="(min-width: 768px) 112px, 96px"
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

      {/* delay-300 = NAME_ENTRANCE_DELAY_MS */}
      <div
        ref={nameBlockRef}
        className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-300 duration-700"
      >
        <h1
          className={cn(
            "text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl short:text-2xl",
            scrambled === null
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-transparent",
          )}
        >
          {/* Shrink-wrapped to the glyphs: the hover target is the name, not
              the full-width row, and the overlay starts at the real text's
              left edge, so letters that have locked in don't jump as the
              random tail changes width (the font is proportional) */}
          <span
            onPointerEnter={handleNamePointerEnter}
            className="relative inline-block"
          >
            {profileData.name}
            {scrambled !== null && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 whitespace-nowrap select-none text-zinc-900 dark:text-zinc-50"
              >
                {scrambled}
              </span>
            )}
          </span>
        </h1>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:text-base">
          {profileData.bio}
        </p>
      </div>
    </header>
  );
}
