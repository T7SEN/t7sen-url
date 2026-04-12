// src/app/error.tsx
"use client";

import * as React from "react";
import { m as motion } from "motion/react";
import * as Sentry from "@sentry/nextjs";
import { SpotlightBackground } from "@/components/ui/spotlight-background";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  React.useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: "app-error",
      },
    });
  }, [error]);

  const handleReset = () => {
    reset();
  };

  return (
    <SpotlightBackground>
      <main className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 font-sans sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 flex w-full max-w-lg flex-col items-center justify-center gap-8 rounded-3xl border border-red-500/20 bg-white/40 p-10 text-center shadow-2xl backdrop-blur-xl dark:border-red-500/20 dark:bg-zinc-950/40"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 dark:bg-red-500/20">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              System Anomaly Detected
            </h2>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              A critical error occurred while attempting to render this
              interface.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-zinc-900 px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:bg-white dark:text-zinc-900 dark:focus-visible:ring-offset-zinc-950"
          >
            <span className="relative z-10">Reboot Interface</span>
            <div className="absolute inset-0 z-0 bg-linear-to-r from-red-500 to-orange-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        </motion.div>
      </main>
    </SpotlightBackground>
  );
}
