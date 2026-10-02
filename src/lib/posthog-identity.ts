// src/lib/posthog-identity.ts
// Server-side PostHog events (short_link_clicked in the proxy,
// twitch_api_called in /api/twitch) used the visitor's raw IP as the person ID.
// Instead, reuse the browser's own anonymous PostHog ID from its first-party
// cookie, so those events join the visitor's session; without one, use a
// throwaway ID. Never the IP.

export type PostHogIdentity = {
  distinctId: string;
  sessionId?: string;
};

// posthog-js session rules: a new session after 30 min idle or 24 h total
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * $sesid is [lastActivityTimestamp, sessionId, sessionStartTimestamp].
 * posthog-js only rotates it on its next event, so the cookie (kept 365 days)
 * can still hold a session that has expired; reusing it would glue a visit
 * onto yesterday's session. Return the ID only while posthog-js would.
 */
function liveSessionId(sesid: unknown): string | undefined {
  if (!Array.isArray(sesid)) return undefined;
  const [lastActivity, sessionId, sessionStart] = sesid;
  if (typeof sessionId !== "string" || typeof lastActivity !== "number") {
    return undefined;
  }
  const now = Date.now();
  if (now - lastActivity > SESSION_IDLE_MS) return undefined;
  if (typeof sessionStart === "number" && now - sessionStart > SESSION_MAX_MS) {
    return undefined;
  }
  return sessionId;
}

/** posthog-js persists to `ph_<project token>_posthog` (localStorage+cookie). */
export function posthogCookieName(token: string): string {
  return `ph_${token}_posthog`;
}

export function readPostHogIdentity(raw: string | undefined): PostHogIdentity {
  if (raw) {
    try {
      // posthog-js writes encodeURIComponent(JSON.stringify(...))
      const text = raw.startsWith("%") ? decodeURIComponent(raw) : raw;
      const parsed = JSON.parse(text) as {
        distinct_id?: unknown;
        $sesid?: unknown;
      };
      if (typeof parsed.distinct_id === "string" && parsed.distinct_id) {
        return {
          distinctId: parsed.distinct_id,
          sessionId: liveSessionId(parsed.$sesid),
        };
      }
    } catch {
      // Malformed cookie: fall through to an anonymous ID
    }
  }

  // Direct /go link, crawler, or cookies blocked
  return { distinctId: crypto.randomUUID() };
}

/**
 * Properties every server-side event should carry: no person profile (the
 * site never identifies anyone, matching posthog-js identified_only), the
 * browser session when known, and no GeoIP (PostHog would geolocate Vercel's
 * server, not the visitor). Only short_link_clicked sends `country` itself.
 */
export function serverEventProperties(
  identity: PostHogIdentity,
): Record<string, unknown> {
  return {
    $process_person_profile: false,
    $geoip_disable: true,
    ...(identity.sessionId ? { $session_id: identity.sessionId } : {}),
  };
}
