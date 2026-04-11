// src/components/copy-email-button.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icons } from "@/components/icons";
import { usePostHog } from "posthog-js/react";

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

      if (posthog) {
        posthog.capture("social_link_clicked", {
          social_id: id,
          social_title: title,
          social_url: emailUrl,
        });
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      // ✨ Added custom focus-visible ring classes here
      className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-transparent text-zinc-500 transition-all hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50 dark:focus-visible:ring-offset-zinc-950 sm:h-12 sm:w-12"
      title={copied ? "Email Copied!" : title}
      aria-label={title}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 10,
            }}
            className="text-emerald-500"
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
            initial={{ scale: 0, opacity: 0, rotate: 180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: -180 }}
            transition={{ duration: 0.2 }}
          >
            <Icons.mail className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
