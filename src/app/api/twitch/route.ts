// src/app/api/twitch/route.ts
import { NextResponse, after, type NextRequest } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { logger } from "@/lib/logger";
import { profileData } from "@/config/profile";
import {
  getCachedSchedule,
  getSchedule,
  getStreamStatus,
  TwitchConfigError,
  type StreamSchedule,
} from "@/lib/twitch";
import { flushSentry, flushSentryAfterResponse } from "@/lib/sentry-flush";
import {
  posthogCookieName,
  readPostHogIdentity,
  serverEventProperties,
} from "@/lib/posthog-identity";

// The schedule is optional on the card: don't hold the live status for a slow
// Helix /schedule (up to 5 s, more with a token refresh)
const SCHEDULE_BUDGET_MS = 1500;

async function getScheduleWithinBudget(
  broadcasterId: string,
): Promise<StreamSchedule | null> {
  const schedule = getSchedule(broadcasterId);
  // A fetch that loses the race still fills the memo for the next request;
  // flush the warning it may log after the route's own flush ran
  after(schedule.then(() => flushSentry()));

  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<StreamSchedule | null>((resolve) => {
    timer = setTimeout(
      () => resolve(getCachedSchedule(broadcasterId)),
      SCHEDULE_BUDGET_MS,
    );
  });

  try {
    return await Promise.race([schedule, budget]);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  flushSentryAfterResponse();

  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");

    if (!channel) {
      return NextResponse.json(
        { error: "Channel name is required" },
        { status: 400 },
      );
    }

    const isValidTwitchUsername = /^[a-zA-Z0-9_]{2,25}$/.test(channel);

    if (!isValidTwitchUsername) {
      logger.warn("Blocked invalid channel parameter", {
        tags: { channel: channel.substring(0, 50) },
      });
      return NextResponse.json(
        { error: "Invalid channel format" },
        { status: 400 },
      );
    }

    // Only answer for this site's channel, so the app credentials can't be
    // used as a free live-status API for arbitrary channels
    if (channel.toLowerCase() !== profileData.twitchChannel.toLowerCase()) {
      return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
    }

    // Only the page's exact URL (StreamStatusProvider) does real work. The
    // CDN keys on the full query string, so extra or reordered params or other
    // casing would each miss the cache and reach PostHog (Helix is memoised);
    // the Vercel Firewall rate limit is per IP only and can't tell these
    // apart. A
    // partial filter: Next has already stripped its internal nxtP*/nxtI*
    // params and re-serialised the query, so such variants still pass.
    if (request.nextUrl.search !== `?channel=${profileData.twitchChannel}`) {
      return NextResponse.json({ error: "Unsupported query" }, { status: 400 });
    }

    // The schedule never rejects (null when unknown) and is time-boxed, so a
    // schedule outage can't delay the status or reach the error branches below
    const [{ isLive, game, title, startedAt }, schedule] = await Promise.all([
      getStreamStatus(channel),
      getScheduleWithinBudget(profileData.twitchUserId),
    ]);

    // Background Analytics Tracking. No token: skip silently like the proxy
    // does (posthog-node >= 5.35.9 would build a disabled, no-op client; its
    // missing-key message only prints in debug mode)
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (token) {
      try {
        // The browser's PostHog ID (its same-origin fetch sends the cookie), never the IP
        const identity = readPostHogIdentity(
          request.cookies.get(posthogCookieName(token))?.value,
        );
        const posthog = getPostHogClient();

        posthog.capture({
          distinctId: identity.distinctId,
          event: "twitch_api_called",
          // 🚀 Track the game in PostHog
          properties: {
            channel,
            is_live: isLive,
            game,
            ...serverEventProperties(identity),
          },
        });

        // Sent after the response: awaiting shutdown() here (up to 30 s with
        // retries) held every poll's response hostage to PostHog. Capped at 5 s
        // so a PostHog outage doesn't keep every poll's function alive for 30 s.
        // posthog-node >= 5.48.2 resolves on that timeout instead of rejecting:
        // it prints a console.error, which consoleLoggingIntegration forwards to
        // Sentry as an error-level log (one per poll during a PostHog outage),
        // so the catch only sees other failures.
        after(async () => {
          try {
            await posthog.shutdown(5000);
          } catch (analyticsError: unknown) {
            logger.error(analyticsError, {
              tags: { component: "PostHogServer" },
            });
          } finally {
            // The route's own flush ran concurrently and may be done already
            await flushSentry();
          }
        });
      } catch (analyticsError: unknown) {
        logger.error(analyticsError, {
          tags: { component: "PostHogServer" },
        });
      }
    }

    // Status plus what the card shows: title and start (live), schedule (offline)
    return NextResponse.json(
      { isLive, game, title, startedAt, schedule },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error: unknown) {
    // 🚀 THE BULLETPROOF CHECK: Duck-typing for the AbortError
    const isAbortError =
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError";

    if (isAbortError) {
      logger.warn(
        "Twitch API request timed out. Gracefully defaulting to offline.",
        { tags: { route: "/api/twitch", issue: "timeout" } },
      );
      // Return a 200 OK with isLive: false so the UI continues to function normally
      return NextResponse.json({ isLive: false });
    }

    // Pass any REAL, unexpected errors (like bad credentials) to Sentry
    logger.error(error, {
      tags: { route: "/api/twitch", layer: "backend" },
    });

    if (error instanceof TwitchConfigError) {
      return NextResponse.json(
        { isLive: false, error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
