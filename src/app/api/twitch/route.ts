// src/app/api/twitch/route.ts
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

// ✨ In-memory cache for DigitalOcean Node process
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

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

/**
 * Safely fetches and caches the Twitch OAuth token in memory.
 */
async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();

  // Return cached token if it exists and is valid for at least 5 more minutes
  if (cachedToken && tokenExpiryTime > now + 300000) {
    return cachedToken;
  }

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
      body: params.toString(), // ✨ Securely passed in body
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

  // Cache the token in memory based on Twitch's explicit expiry time
  cachedToken = tokenData.access_token;
  tokenExpiryTime = now + tokenData.expires_in * 1000;

  // Return the strictly typed local variable instead of the global one
  return tokenData.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");

    if (!channel) {
      return NextResponse.json(
        { error: "Channel name is required" },
        { status: 400 },
      );
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Twitch API Error: Missing OAuth credentials.");
      return NextResponse.json(
        { isLive: false, error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    // 1. Get Token (from memory or fresh fetch)
    const accessToken = await getTwitchAccessToken(clientId, clientSecret);

    // 2. Fetch Stream Status
    const streamResponse = await fetchWithTimeout(
      `https://api.twitch.tv/helix/streams?user_login=${channel}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        // Next.js Data Cache handles GET requests perfectly
        next: { revalidate: 60 },
      },
      5000,
    );

    if (!streamResponse.ok) {
      throw new Error(`Stream fetch failed: ${streamResponse.status}`);
    }

    const streamData = await streamResponse.json();
    const isLive = Array.isArray(streamData.data) && streamData.data.length > 0;

    // 3. Analytics
    try {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: "anonymous",
        event: "twitch_api_called",
        properties: { channel, is_live: isLive },
      });
      await posthog.shutdown();
    } catch (analyticsError: unknown) {
      console.error("PostHog Tracking Error:", analyticsError);
    }

    // 4. Return Data
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    console.error("Twitch API Route Exception:", errorMessage);

    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
