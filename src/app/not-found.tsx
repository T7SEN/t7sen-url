// src/app/not-found.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { SpotlightBackground } from "@/components/ui/spotlight-background";
import { logger } from "@/lib/logger";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    logger.warn("User encountered 404 Not Found", {
      tags: { boundary: "not-found", path: pathname || "unknown" },
    });
  }, [pathname]);

  return (
    <SpotlightBackground>
      <main className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 font-sans sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 flex w-full max-w-lg flex-col items-center justify-center gap-8 rounded-3xl border border-zinc-200/50 bg-white/40 p-10 text-center shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/40"
        >
          <div className="flex flex-col items-center gap-2">
            <h1 className="bg-linear-to-b from-zinc-800 to-zinc-400 bg-clip-text text-8xl font-black tracking-tight text-transparent dark:from-zinc-100 dark:to-zinc-600">
              404
            </h1>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Lost in the Void
            </h2>
            <p className="max-w-xs text-sm font-medium text-zinc-500 dark:text-zinc-400">
              The link you are looking for does not exist or has been moved into
              another dimension.
            </p>
          </div>

          <Link
            href="/"
            className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-zinc-900 px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(145,70,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:bg-white dark:text-zinc-900 dark:focus-visible:ring-offset-zinc-950"
          >
            <div className="absolute inset-0 z-0 bg-linear-to-r from-[#9146FF] to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Return to Reality</span>
          </Link>
        </motion.div>
      </main>
    </SpotlightBackground>
  );
}
