// src/lib/twitch.ts
// Twitch Helix live status, shared by /api/twitch and /api/og so the OG
// image no longer self-fetches /api/twitch through the CDN, proxy and firewall.
import { logger } from "@/lib/logger";

export type StreamStatus = { isLive: boolean; game: string | null };

export const OFFLINE: StreamStatus = { isLive: false, game: null };

/** Thrown when TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET are missing. */
export class TwitchConfigError extends Error {
  constructor() {
    super("Twitch API Error: Missing OAuth credentials");
    this.name = "TwitchConfigError";
  }
}

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_TIMEOUT_MS = 5000;
// Status memo instead of Next's fetch data cache: its stale-while-revalidate
// served old Helix bodies (and hid 401s), so staleness had no hard bound
const STATUS_TTL_MS = 30_000;

// In-memory cache for the Twitch App Access Token (per instance)
let cachedToken: string | null = null;
let tokenExpiryTime = 0;
// One refresh at a time: concurrent requests share the in-flight promise
let tokenRequest: Promise<string> | null = null;

let statusCache: { channel: string; value: StreamStatus; at: number } | null =
  null;
let statusRequest: { channel: string; promise: Promise<StreamStatus> } | null =
  null;

// Fetch and read the body under one timer: clearing it once headers arrive
// let a stalled body hang until undici's 300 s bodyTimeout. abort() with no
// reason rejects with an AbortError, which callers treat as a timeout.
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TWITCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return await read(response);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  logger.breadcrumb("Fetching new Twitch access token", "api.twitch.auth");

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const tokenData = await fetchWithTimeout(
    TOKEN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    },
    async (response) => {
      if (!response.ok) {
        throw new Error(`Token fetch failed with status: ${response.status}`);
      }
      return response.json();
    },
  );

  if (!tokenData.access_token || !tokenData.expires_in) {
    throw new Error("Invalid token payload received from Twitch");
  }

  cachedToken = tokenData.access_token;
  tokenExpiryTime = Date.now() + tokenData.expires_in * 1000;

  logger.info("Successfully acquired Twitch access token", {
    tags: { layer: "backend", component: "TwitchClient" },
  });

  return tokenData.access_token;
}

function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  // Refresh 5 minutes before expiry
  if (cachedToken && tokenExpiryTime > Date.now() + 300000) {
    return Promise.resolve(cachedToken);
  }

  tokenRequest ??= requestAccessToken(clientId, clientSecret).finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
}

async function fetchStreamStatus(channel: string): Promise<StreamStatus> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new TwitchConfigError();
  }

  const fetchStream = (accessToken: string) =>
    fetchWithTimeout(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        // Freshness is bounded by the status memo and the routes' CDN caching
        cache: "no-store",
      },
      async (response) => ({
        status: response.status,
        ok: response.ok,
        body: response.ok ? await response.json() : null,
      }),
    );

  logger.breadcrumb(`Fetching stream status for ${channel}`, "api.twitch.data");

  const accessToken = await getAccessToken(clientId, clientSecret);
  let result = await fetchStream(accessToken);

  // A revoked or rotated token keeps failing until it would have expired
  // (~60 days): drop it and retry once with a fresh one. Only clear the token
  // that failed; a concurrent request may already have stored a new one.
  if (result.status === 401) {
    if (cachedToken === accessToken) {
      cachedToken = null;
      tokenExpiryTime = 0;
    }
    result = await fetchStream(await getAccessToken(clientId, clientSecret));
  }

  if (!result.ok) {
    throw new Error(`Stream fetch failed: ${result.status}`);
  }

  // 🚀 THE UPGRADE: Extract the actual stream object to get the game name
  const stream =
    Array.isArray(result.body?.data) && result.body.data.length > 0
      ? result.body.data[0]
      : null;

  return { isLive: !!stream, game: stream ? stream.game_name : null };
}

/**
 * Live status for a channel, at most STATUS_TTL_MS old (per instance), with
 * concurrent callers sharing one Helix request. Throws TwitchConfigError
 * without credentials, an AbortError on timeout (5 s per Twitch call), and
 * Error on API failures.
 */
export function getStreamStatus(channel: string): Promise<StreamStatus> {
  const key = channel.toLowerCase();

  if (
    statusCache &&
    statusCache.channel === key &&
    Date.now() - statusCache.at < STATUS_TTL_MS
  ) {
    return Promise.resolve(statusCache.value);
  }

  if (statusRequest && statusRequest.channel === key) {
    return statusRequest.promise;
  }

  const promise = fetchStreamStatus(key)
    .then((value) => {
      statusCache = { channel: key, value, at: Date.now() };
      return value;
    })
    .finally(() => {
      if (statusRequest?.promise === promise) statusRequest = null;
    });

  statusRequest = { channel: key, promise };
  return promise;
}
