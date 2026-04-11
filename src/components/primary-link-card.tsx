// src/components/primary-link-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { ProfileLink } from "@/config/profile";
import { usePostHog } from "posthog-js/react";

interface PrimaryLinkCardProps {
  link: ProfileLink;
}

export function PrimaryLinkCard({ link }: PrimaryLinkCardProps) {
  const posthog = usePostHog();
  const Icon = link.icon;

  const handleClick = () => {
    if (posthog) {
      posthog.capture("link_clicked", {
        link_id: link.id,
        link_title: link.title,
        link_url: link.url,
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      // ✨ Added custom focus-visible ring classes here
      className={`group/btn relative h-14 w-full overflow-hidden rounded-2xl border-zinc-200/80 bg-white/60 text-sm font-semibold transition-all hover:scale-[1.02] hover:bg-white hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950 sm:text-base ${
        link.isFeatured
          ? "shadow-[#9146FF]/5 border-[#9146FF]/30 dark:border-[#9146FF]/30"
          : ""
      }`}
      asChild
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        {link.isFeatured && (
          <div className="absolute inset-0 -z-10 animate-pulse bg-linear-to-r from-[#9146FF]/10 via-transparent to-[#9146FF]/10 opacity-50 dark:from-[#9146FF]/20 dark:to-[#9146FF]/20" />
        )}

        <div
          className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${
            link.isFeatured
              ? "text-[#9146FF] dark:text-[#9146FF]"
              : "text-zinc-400 group-hover/btn:text-zinc-900 dark:group-hover/btn:text-zinc-50"
          }`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </div>
        <span className="w-full text-center">{link.title}</span>
      </a>
    </Button>
  );
}
