// src/components/share-profile-button.tsx
"use client";

import * as React from "react";
import { m as motion, AnimatePresence } from "motion/react";
import { usePostHog } from "posthog-js/react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { profileData } from "@/config/profile";
import { siteUrl } from "@/config/links";

export function ShareProfileButton() {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const posthog = usePostHog();

  React.useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Share the canonical page, not window.location.href: bio-link visits carry
    // utm_*/fbclid params that would otherwise travel with every share
    const url = siteUrl;
    const title = `${profileData.name} | Links`;

    // 1. Try the Native OS Share Sheet first
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: profileData.shareText,
          url: url,
        });

        // 🚀 Telemetry fires only once a share actually happened
        if (posthog) {
          posthog.capture("profile_shared", {
            method: "native",
            share_url: url,
          });
        }
        logger.info("Profile shared via native OS API", {
          tags: { component: "ShareProfileButton", method: "native" },
        });
        return; // Exit early if successful
      } catch (err) {
        // User closed the share sheet without sharing: not a share, no fallback
        if ((err as Error).name === "AbortError") return;

        logger.warn("Native share failed, falling back to clipboard", {
          tags: { component: "ShareProfileButton" },
          extra: {
            errorName: (err as Error).name,
            errorMessage: (err as Error).message,
          },
        });
      }
    }

    // 2. Fallback: Copy to Clipboard (for unsupported desktop browsers)
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);

      if (posthog) {
        posthog.capture("profile_shared", {
          method: "clipboard",
          share_url: url,
        });
      }
      logger.info("Profile URL copied to clipboard fallback", {
        tags: { component: "ShareProfileButton", method: "clipboard" },
      });

      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      logger.error(err, {
        tags: {
          component: "ShareProfileButton",
          action: "clipboard_write_failed",
        },
      });
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={cn(
          "group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 sm:h-12 sm:w-12",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
          copied
            ? "scale-110 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-inner dark:bg-emerald-500/20 dark:text-emerald-400"
            : "border-transparent bg-transparent text-zinc-500 hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50",
        )}
        title="Share Profile"
        aria-label="Share Profile"
      >
        {/* The Floating "Copied!" Badge (Fallback state) */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-none absolute left-full top-1/2 ml-3 flex -translate-y-1/2 items-center whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-50 shadow-lg dark:bg-zinc-50 dark:text-zinc-900"
            >
              Copied!
              <div className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-zinc-900 dark:bg-zinc-50" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Icon Swap Engine */}
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {/* Network/Nodes Share Icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      {/* Always mounted so screen readers announce the copy (the badge is visual only) */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Profile link copied to clipboard" : ""}
      </span>
    </>
  );
}
