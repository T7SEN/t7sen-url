// src/app/api/twitch/route.ts
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET(request: Request) {
  try {
    // 1. Get the channel name from the URL query params (e.g., /api/twitch?channel=t7sen)
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
      console.error("Twitch credentials are missing in environment variables.");
      return NextResponse.json(
        { isLive: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    // 2. Fetch the OAuth App Access Token using Client Credentials flow
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      {
        method: "POST",
        // We cache the token fetch for a short period to avoid rate limits
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to fetch Twitch access token");
    }

    // 3. Query the official Twitch API to see if the user is streaming
    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channel}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        // We revalidate this stream check every 60 seconds
        next: { revalidate: 60 },
      },
    );

    const streamData = await streamResponse.json();

    // If the data array has elements, the user is live. If empty, they are offline.
    const isLive = streamData.data && streamData.data.length > 0;

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: "anonymous",
      event: "twitch_api_called",
      properties: { channel, is_live: isLive },
    });
    await posthog.shutdown();

    return NextResponse.json({ isLive });
  } catch (error) {
    console.error("Twitch API Error:", error);
    // Default to offline on any failure so the UI gracefully degrades
    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
