// src/app/api/twitch/route.ts
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { logger } from "@/lib/logger";

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60000;
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
  }

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    logger.warn("Rate limit exceeded", { tags: { ip, route: "/api/twitch" } });
    return false;
  }

  record.count += 1;
  return true;
}

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = 5000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();

  if (cachedToken && tokenExpiryTime > now + 300000) {
    return cachedToken;
  }

  logger.breadcrumb("Fetching new Twitch access token", "api.twitch.auth");

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const tokenResponse = await fetchWithTimeout(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
    5000,
  );

  if (!tokenResponse.ok) {
    throw new Error(`Token fetch failed with status: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token || !tokenData.expires_in) {
    throw new Error("Invalid token payload received from Twitch");
  }

  cachedToken = tokenData.access_token;
  tokenExpiryTime = now + tokenData.expires_in * 1000;

  logger.info("Successfully acquired Twitch access token", {
    tags: { layer: "backend", route: "/api/twitch" },
  });

  return tokenData.access_token;
}

export async function GET(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");

    if (!channel) {
      logger.warn("Twitch API called without channel parameter", {
        tags: { ip },
      });
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

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Twitch API Error: Missing OAuth credentials", {
        tags: { route: "/api/twitch" },
      });
      return NextResponse.json(
        { isLive: false, error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const accessToken = await getTwitchAccessToken(clientId, clientSecret);

    logger.breadcrumb(
      `Fetching stream status for ${channel}`,
      "api.twitch.data",
    );

    const streamResponse = await fetchWithTimeout(
      `https://api.twitch.tv/helix/streams?user_login=${channel}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 60 },
      },
      5000,
    );

    if (!streamResponse.ok) {
      throw new Error(`Stream fetch failed: ${streamResponse.status}`);
    }

    const streamData = await streamResponse.json();
    const isLive = Array.isArray(streamData.data) && streamData.data.length > 0;

    try {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: ip,
        event: "twitch_api_called",
        properties: { channel, is_live: isLive },
      });
      await posthog.shutdown();
    } catch (analyticsError: unknown) {
      logger.error(analyticsError, {
        tags: { component: "PostHogServer" },
      });
    }

    return NextResponse.json(
      { isLive },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error: unknown) {
    logger.error(error, {
      tags: { route: "/api/twitch", layer: "backend" },
    });

    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
