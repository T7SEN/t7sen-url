// src/components/live-ambience.tsx
"use client";

import * as React from "react";
import { useStreamStatus } from "@/components/stream-status-provider";

// public/icon-live.svg: icon.svg plus a red dot (scripts/generate-icons.mjs)
const LIVE_ICON_HREF = "/icon-live.svg";

/**
 * Everything outside the cards that changes while the stream is live: a
 * breathing purple stage light behind the page, and a "LIVE" prefix and red
 * dot on the browser tab. Hidden tabs don't poll (SWR's default), so the tab
 * shows the status from when the page was last visible.
 */
export function LiveAmbience() {
  const { isLive } = useStreamStatus();

  React.useEffect(() => {
    if (!isLive) return;

    const title = document.title;
    // Next's file-based icon (src/app/icon.svg); restored when the stream ends
    const icons = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        'link[rel="icon"][type="image/svg+xml"]',
      ),
    );
    const hrefs = icons.map((icon) => icon.getAttribute("href"));

    document.title = `🔴 LIVE · ${title}`;
    for (const icon of icons) icon.setAttribute("href", LIVE_ICON_HREF);

    return () => {
      document.title = title;
      icons.forEach((icon, i) => {
        const href = hrefs[i];
        if (href) icon.setAttribute("href", href);
      });
    };
  }, [isLive]);

  if (!isLive) return null;

  return (
    // -z-10 inside SpotlightBackground's content layer: above the page
    // background, below the cards and the footer
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 animate-in fade-in duration-1000"
    >
      <div className="absolute inset-x-0 top-0 h-[70vh] animate-live-breathe bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(145,70,255,0.16),transparent)] dark:bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(145,70,255,0.24),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-[50vh] animate-live-breathe bg-[radial-gradient(ellipse_50%_60%_at_15%_100%,rgba(239,68,68,0.08),transparent),radial-gradient(ellipse_50%_60%_at_85%_100%,rgba(59,130,246,0.08),transparent)] [animation-delay:-3s] dark:bg-[radial-gradient(ellipse_50%_60%_at_15%_100%,rgba(239,68,68,0.12),transparent),radial-gradient(ellipse_50%_60%_at_85%_100%,rgba(59,130,246,0.12),transparent)]" />
    </div>
  );
}
