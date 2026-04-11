// src/components/support-card.tsx
"use client";

import { motion } from "motion/react";
import { usePostHog } from "posthog-js/react";
import { profileData } from "@/config/profile";

export function SupportCard() {
  const posthog = usePostHog();
  const support = profileData.support;

  if (!support) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <a
        href={support.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (posthog) {
            posthog.capture("support_link_clicked", {
              support_id: support.id,
              support_url: support.url,
            });
          }
        }}
        // 🚀 THE ARCHITECTURE: The Obsidian Sigil.
        // Uses a 1px gap to reveal a sharp, static gradient border.
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl p-px bg-linear-to-b from-zinc-200/50 to-transparent transition-all duration-500 hover:scale-[1.02] hover:from-[#9146FF]/50 hover:to-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:from-zinc-800/50 dark:focus-visible:ring-offset-zinc-950"
      >
        {/* Inner Content Layer (Glass Chassis) */}
        <div className="relative flex w-full items-center justify-between rounded-[calc(1rem-1px)] bg-white/80 p-4 backdrop-blur-md transition-colors duration-500 group-hover:bg-white dark:bg-[#030303]/90 dark:group-hover:bg-[#030303]">
          {/* Left Section: Branding & Identity */}
          <div className="flex items-center gap-4">
            {/* The "Soul" Icon Container: Muted until hover */}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm transition-all duration-500 group-hover:border-[#9146FF]/30 group-hover:bg-[#9146FF]/5 dark:border-zinc-800 dark:bg-zinc-900 dark:group-hover:border-[#9146FF]/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-400 transition-all duration-500 group-hover:scale-110 group-hover:text-[#9146FF] dark:text-zinc-600"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>

            {/* Text Content */}
            <div className="flex flex-col text-left">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100">
                {support.title}
              </h3>
              <p className="text-[11px] font-bold text-[#9146FF]/80 transition-colors duration-500 group-hover:text-[#9146FF]">
                {support.subtitle}
              </p>
            </div>
          </div>

          {/* Right Section: Minimalist Action Arrow */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-100 text-zinc-300 transition-all duration-500 group-hover:translate-x-1 group-hover:border-[#9146FF]/20 group-hover:bg-[#9146FF]/5 group-hover:text-[#9146FF] dark:border-zinc-800 dark:text-zinc-800">
            <svg
              width="16"
              height="16"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.1584 3.13508C6.35985 2.95662 6.66436 2.97484 6.84283 3.1763L10.3428 7.1763C10.5053 7.36195 10.5053 7.63805 10.3428 7.8237L6.84283 11.8237C6.66436 12.0252 6.35985 12.0434 6.1584 11.8649C5.95694 11.6865 5.93872 11.382 6.11718 11.1805L9.27878 7.5L6.11718 3.81949C5.93872 3.61803 5.95694 3.31353 6.1584 3.13508Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </a>
    </motion.div>
  );
}
