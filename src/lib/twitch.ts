// src/lib/twitch.ts
// Twitch Helix live status (shared by /api/twitch and /api/og, so the OG image
// never self-fetches /api/twitch through the CDN and firewall) and the stream
// schedule (/api/twitch only).
import { logger } from "@/lib/logger";

export type StreamStatus = {
  isLive: boolean;
  game: string | null;
  /** Stream title as set on Twitch (shown verbatim, CSS-truncated) */
  title: string | null;
  /** RFC 3339 UTC start of the current stream; the card derives uptime */
  startedAt: string | null;
};

export const OFFLINE: StreamStatus = {
  isLive: false,
  game: null,
  title: null,
  startedAt: null,
};

export type ScheduleSegment = {
  /** RFC 3339 UTC */
  startTime: string;
  endTime: string | null;
  title: string | null;
  category: string | null;
};

export type StreamSchedule = {
  /** Upcoming (or in-progress) segments, canceled ones removed, by start */
  segments: ScheduleSegment[];
  /** Vacation window, only while it has not ended */
  vacation: { startTime: string; endTime: string } | null;
};

/** The channel has no schedule (Helix answers 404) or nothing upcoming. */
export const NO_SCHEDULE: StreamSchedule = { segments: [], vacation: null };

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
// The schedule changes rarely: one Helix call per 15 min per instance, well
// inside the Developer Agreement's 24 h caching limit
const SCHEDULE_TTL_MS = 15 * 60_000;
// After a failed schedule fetch, retry no sooner than this...
const SCHEDULE_RETRY_MS = 60_000;
// ...and keep serving the last good schedule through failures this long
const SCHEDULE_STALE_MS = 60 * 60_000;
// Ask for segments from this far back so a slot that already started (a
// late stream) still shows as "scheduled now" instead of skipping a week
const SCHEDULE_LOOKBACK_MS = 12 * 60 * 60_000;
const SCHEDULE_MAX_SEGMENTS = 3;

// In-memory cache for the Twitch App Access Token (per instance)
let cachedToken: string | null = null;
let tokenExpiryTime = 0;
// One refresh at a time: concurrent requests share the in-flight promise
let tokenRequest: Promise<string> | null = null;

let statusCache: { channel: string; value: StreamStatus; at: number } | null =
  null;
let statusRequest: { channel: string; promise: Promise<StreamStatus> } | null =
  null;

let scheduleCache: {
  broadcasterId: string;
  value: StreamSchedule | null;
  /** When the cached value was fetched successfully (0: never) */
  goodAt: number;
  /** When this entry stops being fresh */
  expiresAt: number;
} | null = null;
let scheduleRequest: {
  broadcasterId: string;
  promise: Promise<StreamSchedule | null>;
} | null = null;

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

type HelixResult = { status: number; ok: boolean; body: unknown };

/**
 * GET a Helix endpoint with the app access token: 5 s timeout covering the
 * body, and on a 401 one retry with a fresh token. Throws TwitchConfigError
 * without credentials and an AbortError on timeout; HTTP errors are returned.
 */
async function helixGet(pathAndQuery: string): Promise<HelixResult> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new TwitchConfigError();
  }

  const request = (accessToken: string) =>
    fetchWithTimeout(
      `https://api.twitch.tv/helix${pathAndQuery}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        // Freshness is bounded by the memos here and the routes' CDN caching
        cache: "no-store",
      },
      async (response): Promise<HelixResult> => ({
        status: response.status,
        ok: response.ok,
        body: response.ok ? await response.json() : null,
      }),
    );

  const accessToken = await getAccessToken(clientId, clientSecret);
  const result = await request(accessToken);

  // A revoked or rotated token keeps failing until it would have expired
  // (~60 days): drop it and retry once with a fresh one. Only clear the token
  // that failed; a concurrent request may already have stored a new one.
  if (result.status === 401) {
    if (cachedToken === accessToken) {
      cachedToken = null;
      tokenExpiryTime = 0;
    }
    return request(await getAccessToken(clientId, clientSecret));
  }

  return result;
}

// Helix sends "" for an unset title or category
function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

async function fetchStreamStatus(channel: string): Promise<StreamStatus> {
  logger.breadcrumb(`Fetching stream status for ${channel}`, "api.twitch.data");

  const result = await helixGet(
    `/streams?user_login=${encodeURIComponent(channel)}`,
  );

  if (!result.ok) {
    throw new Error(`Stream fetch failed: ${result.status}`);
  }

  // An offline channel answers with an empty data array
  const data = (result.body as { data?: unknown } | null)?.data;
  const stream =
    Array.isArray(data) && data.length > 0
      ? (data[0] as Record<string, unknown>)
      : null;

  if (!stream) return OFFLINE;

  return {
    isLive: true,
    game: textOrNull(stream.game_name),
    title: textOrNull(stream.title),
    startedAt: textOrNull(stream.started_at),
  };
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

function parseSchedule(body: unknown, now: number): StreamSchedule {
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return NO_SCHEDULE;

  // Vacation mode is often left on after it ends: ignore a finished one
  const rawVacation = data.vacation as Record<string, unknown> | null;
  const vacationStart = textOrNull(rawVacation?.start_time);
  const vacationEnd = textOrNull(rawVacation?.end_time);
  const vacation =
    vacationStart && vacationEnd && Date.parse(vacationEnd) > now
      ? { startTime: vacationStart, endTime: vacationEnd }
      : null;
  const inVacation = (start: number) =>
    vacation !== null &&
    start >= Date.parse(vacation.startTime) &&
    start < Date.parse(vacation.endTime);

  // segments may be null; canceled ones are still listed (canceled_until set)
  const segments = (Array.isArray(data.segments) ? data.segments : [])
    .map((raw) => raw as Record<string, unknown>)
    .filter((seg) => seg.canceled_until == null)
    .map(
      (seg): ScheduleSegment => ({
        startTime: textOrNull(seg.start_time) ?? "",
        endTime: textOrNull(seg.end_time),
        title: textOrNull(seg.title),
        // An object per the reference, a bare id in one guide example
        category:
          seg.category && typeof seg.category === "object"
            ? textOrNull((seg.category as { name?: unknown }).name)
            : null,
      }),
    )
    .filter((seg) => {
      const start = Date.parse(seg.startTime);
      const end = seg.endTime ? Date.parse(seg.endTime) : start;
      // Vacation mode doesn't cancel the segments inside it: drop them before
      // keeping the first few, or a long break would crowd out the next stream
      return !Number.isNaN(start) && end > now && !inVacation(start);
    })
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    .slice(0, SCHEDULE_MAX_SEGMENTS);

  return { segments, vacation };
}

async function fetchSchedule(broadcasterId: string): Promise<StreamSchedule> {
  const now = Date.now();
  const startTime = new Date(now - SCHEDULE_LOOKBACK_MS).toISOString();
  const result = await helixGet(
    `/schedule?broadcaster_id=${encodeURIComponent(broadcasterId)}` +
      `&start_time=${encodeURIComponent(startTime)}&first=10`,
  );

  // 404: the broadcaster never created a schedule. A normal state, not an error
  if (result.status === 404) return NO_SCHEDULE;
  if (!result.ok) {
    throw new Error(`Schedule fetch failed: ${result.status}`);
  }

  return parseSchedule(result.body, now);
}

/**
 * Upcoming stream schedule for a broadcaster (numeric Twitch user ID), memoised
 * per instance for 15 min with one in-flight Helix request shared by
 * concurrent callers. Never rejects: on a failure it serves the last good
 * schedule for up to an hour, else null (unknown), and retries after 60 s.
 * Kept out of getStreamStatus() so the OG image's 2.5 s budget never waits on it.
 */
export function getSchedule(broadcasterId: string): Promise<StreamSchedule | null> {
  const now = Date.now();

  if (
    scheduleCache &&
    scheduleCache.broadcasterId === broadcasterId &&
    now < scheduleCache.expiresAt
  ) {
    return Promise.resolve(scheduleCache.value);
  }

  if (scheduleRequest && scheduleRequest.broadcasterId === broadcasterId) {
    return scheduleRequest.promise;
  }

  const previous =
    scheduleCache?.broadcasterId === broadcasterId ? scheduleCache : null;

  const promise = fetchSchedule(broadcasterId)
    .then((value) => {
      const at = Date.now();
      scheduleCache = {
        broadcasterId,
        value,
        goodAt: at,
        expiresAt: at + SCHEDULE_TTL_MS,
      };
      return value;
    })
    .catch((err: unknown) => {
      const at = Date.now();
      const stale =
        previous && previous.goodAt > 0 && at - previous.goodAt < SCHEDULE_STALE_MS
          ? previous
          : null;
      // Missing credentials already fail the live status loudly; don't repeat it
      if (!(err instanceof TwitchConfigError)) {
        logger.warn("Twitch schedule fetch failed", {
          tags: { component: "TwitchClient", issue: "schedule_fetch_failed" },
          extra: {
            error: err instanceof Error ? err.message : String(err),
            servingStale: stale !== null,
          },
        });
      }
      scheduleCache = {
        broadcasterId,
        value: stale ? stale.value : null,
        goodAt: stale ? stale.goodAt : 0,
        expiresAt: at + SCHEDULE_RETRY_MS,
      };
      return scheduleCache.value;
    })
    .finally(() => {
      if (scheduleRequest?.promise === promise) scheduleRequest = null;
    });

  scheduleRequest = { broadcasterId, promise };
  return promise;
}

/** The last schedule this instance fetched (even if its memo has expired). */
export function getCachedSchedule(broadcasterId: string): StreamSchedule | null {
  return scheduleCache?.broadcasterId === broadcasterId
    ? scheduleCache.value
    : null;
}
