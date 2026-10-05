// src/components/stream-status-provider.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import { profileData } from "@/config/profile";
import { logger } from "@/lib/logger";
import type { StreamSchedule } from "@/lib/twitch";

// Fields beyond isLive are optional: the route's timeout fallback sends only
// { isLive: false }
export type TwitchStatus = {
  isLive: boolean;
  game?: string | null;
  title?: string | null;
  startedAt?: string | null;
  schedule?: StreamSchedule | null;
};
type TwitchFetchError = Error & { status?: number };

export type StreamStatusValue = {
  data: TwitchStatus | undefined;
  /** null until the first response (or while the status is unknown) */
  isLive: boolean | null;
  /** The first request failed: no status to show, which is not "offline" */
  isUnknown: boolean;
};

const StreamStatusContext = React.createContext<StreamStatusValue | null>(null);

// Throw on non-2xx so a 429/500 body never replaces the last known status
const fetcher = async (url: string): Promise<TwitchStatus> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw Object.assign(new Error(`/api/twitch responded ${res.status}`), {
      status: res.status,
    });
  }
  return res.json();
};

/**
 * Polls /api/twitch once for the whole page. The Twitch card, the avatar ring
 * and the live ambience all read it, so live mode costs no extra request (two
 * useSWR hooks on one key would each run their own refresh and retry timers).
 */
export function StreamStatusProvider({ children }: { children: React.ReactNode }) {
  // While the page is visible and online, SWR calls onErrorRetry after every
  // failed request it starts, focus revalidations included, so a timer per
  // call stacked parallel 60 s retry loops during an outage. Keep exactly one
  // pending retry.
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => () => clearTimeout(retryTimerRef.current), []);

  const { data, error } = useSWR<TwitchStatus, TwitchFetchError>(
    `/api/twitch?channel=${profileData.twitchChannel}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      // Focus revalidation at most every 30 s, however often the tab switches
      focusThrottleInterval: 30000,
      // SWR pauses refreshInterval while an error is cached, so retry on the
      // same 60 s cadence as refreshInterval to keep polling
      onErrorRetry: (_err, _key, _config, revalidate, opts) => {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => revalidate(opts), 60000);
      },
      onSuccess: () => clearTimeout(retryTimerRef.current),
    },
  );

  React.useEffect(() => {
    if (!error) return;
    // An HTTP status means the server answered: 5xx is already reported
    // server-side and a 429 is the Vercel Firewall rate limit (see SKILL.md),
    // so don't raise a second exception
    if (error.status) {
      logger.warn("Twitch status request failed", {
        tags: {
          component: "StreamStatusProvider",
          issue: "swr_http_error",
          status: String(error.status),
        },
      });
      return;
    }
    logger.error(error, {
      tags: { component: "StreamStatusProvider", issue: "swr_fetch_failed" },
    });
  }, [error]);

  // SWR keeps the last good data on a failed revalidation: show it rather than
  // flipping a live stream to Offline. With no data at all (the first request
  // failed: a 5xx, no network) the status is unknown, not offline.
  const value: StreamStatusValue = {
    data,
    isLive: data === undefined ? null : data.isLive === true,
    isUnknown: data === undefined && error !== undefined,
  };

  return <StreamStatusContext value={value}>{children}</StreamStatusContext>;
}

export function useStreamStatus(): StreamStatusValue {
  const value = React.use(StreamStatusContext);
  if (!value) {
    throw new Error("useStreamStatus must be used inside StreamStatusProvider");
  }
  return value;
}
