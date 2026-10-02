// src/app/api/twitch/route.ts
import { NextResponse, after, type NextRequest } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { logger } from "@/lib/logger";
import { profileData } from "@/config/profile";
import { getStreamStatus, TwitchConfigError } from "@/lib/twitch";
import { flushSentry, flushSentryAfterResponse } from "@/lib/sentry-flush";
import {
  posthogCookieName,
  readPostHogIdentity,
  serverEventProperties,
} from "@/lib/posthog-identity";

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

    const { isLive, game } = await getStreamStatus(channel);

    // Background Analytics Tracking. No token: skip silently like the proxy
    // does (the PostHog constructor throws, which reported a Sentry error on
    // every call)
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

    // 🚀 Return BOTH the live status and the game
    return NextResponse.json(
      { isLive, game },
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
