// src/components/copy-email-button.tsx
"use client";

import * as React from "react";
import { m as motion, AnimatePresence } from "motion/react";
import { Icons } from "@/components/icons";
import { usePostHog } from "posthog-js/react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface CopyEmailButtonProps {
  id: string;
  emailUrl: string;
  title: string;
}

export function CopyEmailButton({ id, emailUrl, title }: CopyEmailButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const posthog = usePostHog();

  const emailAddress = emailUrl.replace("mailto:", "");

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopied(true);

      // 🚀 Telemetry strictly preserved
      if (posthog) {
        posthog.capture("social_link_clicked", {
          social_id: id,
          social_title: title,
          social_url: emailUrl,
        });
      }

      logger.info("User copied email address", {
        tags: { component: "CopyEmailButton", socialId: id },
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      logger.error(err, {
        tags: { component: "CopyEmailButton", action: "clipboard_write" },
      });
    }
  };

  return (
    <button
      onClick={handleCopy}
      // 🚀 Button width is strictly locked to w-10/w-12 to prevent any layout shifts
      className={cn(
        "group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-all sm:h-12 sm:w-12",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
        copied
          ? // Success State (Green Border/Icon)
            "scale-110 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-inner dark:bg-emerald-500/20 dark:text-emerald-400"
          : // Default State
            "border-transparent bg-transparent text-zinc-500 hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50",
      )}
      title={copied ? "Email Copied!" : title}
      aria-label={title}
    >
      {/* 🚀 The Floating "Copied!" Badge (Absolutely positioned to prevent layout shift) */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -45, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-50 shadow-lg dark:bg-zinc-50 dark:text-zinc-900"
          >
            Copied!
            {/* CSS Triangle pointing down to the button */}
            <div className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-zinc-900 dark:bg-zinc-50" />
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
            key="mail"
            initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Icons.mail className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
