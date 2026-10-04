// src/proxy.ts
import { NextResponse, userAgent as parseUserAgent } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { shortLinks, slugAliases } from "@/config/links";
import { flushSentry, flushSentryAfterResponse } from "@/lib/sentry-flush";
import {
  posthogCookieName,
  readPostHogIdentity,
  serverEventProperties,
} from "@/lib/posthog-identity";

// =========================================================
// 1. DATA DICTIONARIES
// =========================================================

// Built from src/config/links.ts, the single list of destinations (slugs are
// lowercase there; incoming slugs are lowercased below)
const redirectMap = new Map<string, string>([
  ...Object.entries(shortLinks),
  ...Object.entries(slugAliases).map(
    ([alias, slug]): [string, string] => [alias, shortLinks[slug]],
  ),
]);

// Extra non-human tokens on top of userAgent().isBot (which covers the major
// unfurlers) and the /\bbot\b/ check: generic HTTP clients and preview fetchers
const NON_HUMAN_AGENTS = [
  "bot/",
  "crawler",
  "spider",
  "headless",
  "python-requests",
  "curl/",
  "wget/",
  "scrapy",
  "postmanruntime",
  "http.rb", // Mastodon link previews
  "go-http-client",
  "okhttp",
  "axios/",
  "node-fetch",
  "undici",
  "iframely",
  "cardyb", // Bluesky link cards
];

// =========================================================
// 2. proxy ENGINE
// =========================================================

export function proxy(request: NextRequest, event: NextFetchEvent) {
  // Send the console logs and spans Sentry buffered during this invocation
  flushSentryAfterResponse();

  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // 🚀 GLOBAL EXTRACTION: Extract country
  // cf-ipcountry is no longer trusted: without Cloudflare in front, any client can send it
  const country = request.headers.get("x-vercel-ip-country") || "Global";

  // ---------------------------------------------------------
  // THE REDIRECT ENGINE
  // ---------------------------------------------------------
  if (pathname.startsWith("/go/")) {
    // skipTrailingSlashRedirect leaves "/go/github/" as-is, so strip trailing slashes here
    const slug = pathname.slice("/go/".length).replace(/\/+$/, "").toLowerCase();
    const destination = redirectMap.get(slug);

    if (!destination) {
      console.warn(
        `[Edge Redirect] Unknown short link slug: ${slug.slice(0, 64)}`,
      );
      return NextResponse.redirect(new URL("/", request.url));
    }

    console.info(
      `[Edge Redirect] Short Link Clicked: ${slug} (from ${country})`,
    );

    // Every method and agent still gets the redirect; only real clicks are counted
    const purpose = (
      request.headers.get("sec-purpose") ||
      request.headers.get("purpose") ||
      ""
    ).toLowerCase();
    const isHumanClick =
      request.method === "GET" &&
      userAgent !== "" && // real browsers always send one
      !purpose.includes("prefetch") &&
      !parseUserAgent(request).isBot &&
      !/\bbot\b/.test(userAgent) && // e.g. "Snap URL Preview Service; bot; ..."
      !NON_HUMAN_AGENTS.some((token) => userAgent.includes(token));

    const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (posthogToken && isHumanClick) {
      // The browser's PostHog ID (first-party cookie) instead of the visitor's IP
      const identity = readPostHogIdentity(
        request.cookies.get(posthogCookieName(posthogToken))?.value,
      );

      event.waitUntil(
        fetch("https://eu.i.posthog.com/capture/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: posthogToken,
            distinct_id: identity.distinctId,
            event: "short_link_clicked",
            properties: {
              slug,
              destination,
              country,
              $current_url: request.url,
              $referrer: request.headers.get("referer") ?? undefined,
              $lib: "edge-proxy",
              ...serverEventProperties(identity),
            },
          }),
        })
          .then((res) => {
            // fetch only rejects on network errors; an HTTP error (PostHog
            // 5xx or 429) also loses the event
            if (res.ok) return;
            Sentry.captureMessage(`PostHog capture responded ${res.status}`, {
              level: "warning",
              tags: { issue: "posthog_edge_fetch_failed" },
            });
            // Captured after the response-time flush may have run: flush again
            return flushSentry();
          })
          .catch((err) => {
            Sentry.captureException(err, {
              tags: { issue: "posthog_edge_fetch_failed" },
            });
            return flushSentry();
          }),
      );
    }

    return NextResponse.redirect(destination, 307);
  }

  // Nothing else is matched (see config below); pass through untouched
  return NextResponse.next();
}

// =========================================================
// 3. MATCHER CONFIGURATION
// =========================================================
// Short links only. The /api/* user-agent block and per-IP rate limit moved to
// the Vercel Firewall (rules listed in SKILL.md), which runs before the CDN
// cache and costs nothing for what it blocks: with /api/* matched here, every
// /api/twitch poll ran this function even when the CDN answered from cache.
// The page, static files, /api, /ingest (PostHog), /monitoring (Sentry tunnel)
// and /_vercel (Web Analytics / Speed Insights) never run it.
export const config = {
  matcher: ["/go/:path*"],
};
