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
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-amber-200/60 bg-linear-to-r from-amber-50 to-rose-50 p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-amber-900/30 dark:from-amber-950/20 dark:to-rose-950/20 dark:hover:border-amber-700/50 dark:focus-visible:ring-offset-zinc-950"
      >
        {/* Ambient Glow Effect on Hover */}
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-amber-500/0 to-rose-500/0 transition-colors duration-300 group-hover:from-amber-500/10 group-hover:to-rose-500/10 dark:group-hover:from-amber-500/20 dark:group-hover:to-rose-500/20" />

        {/* Icon & Text */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-rose-400 text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            {/* Custom Heart Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {support.title}
            </h3>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {support.subtitle}
            </p>
          </div>
        </div>

        {/* Arrow Indicator */}
        <div className="text-amber-500/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-amber-600 dark:text-amber-500/50 dark:group-hover:text-amber-400">
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
      </a>
    </motion.div>
  );
}
