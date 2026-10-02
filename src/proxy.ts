// src/proxy.ts
import { NextResponse, userAgent as parseUserAgent } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { flushSentry, flushSentryAfterResponse } from "@/lib/sentry-flush";
import {
  posthogCookieName,
  readPostHogIdentity,
  serverEventProperties,
} from "@/lib/posthog-identity";

// =========================================================
// 1. DATA DICTIONARIES
// =========================================================

const redirectMap = new Map<string, string>([
  ["website", "https://t7sen.com"],
  ["discord", "https://discord.com/users/170916597156937728"],
  ["instagram", "https://instagram.com/t7me.1"],
  ["github", "https://github.com/t7sen"],
  ["twitter", "https://x.com/T7ME_"],
  ["x", "https://x.com/T7ME_"],
  ["support", "https://creators.sa/t7sen"],
  ["email", "mailto:hello@t7sen.com"],
]);

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 10;
// Compared against the lowercased user agent
const BLOCKED_AGENTS = ["python-requests", "curl", "postmanruntime", "scrapy"];
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
  // Vercel sets x-real-ip / x-forwarded-for to the connecting client (DNS-only, no proxy in front)
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // 🚀 GLOBAL EXTRACTION: Extract country
  // cf-ipcountry is no longer trusted: without Cloudflare in front, any client can send it
  const country = request.headers.get("x-vercel-ip-country") || "Global";

  // ---------------------------------------------------------
  // LAYER 1: THE EDGE FIREWALL
  // ---------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    if (BLOCKED_AGENTS.some((bot) => userAgent.includes(bot))) {
      console.warn(
        `[Edge Firewall] Blocked malicious agent: ${userAgent} from IP: ${ip}`,
      );
      return new NextResponse("Forbidden", { status: 403 });
    }

    const now = Date.now();

    if (rateLimitMap.size > 1000) {
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) rateLimitMap.delete(key);
      }
    }

    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    } else if (record.count >= MAX_REQUESTS) {
      console.warn(`[Edge Firewall] Rate Limit Exceeded: ${ip}`);
      return NextResponse.json(
        { error: "Too Many Requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    } else {
      record.count += 1;
    }

    // Passed the firewall: hand the request to the route untouched
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // LAYER 2: THE REDIRECT ENGINE
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
        }).catch((err) => {
          Sentry.captureException(err, {
            tags: { issue: "posthog_edge_fetch_failed" },
          });
          // Captured after the response-time flush may have run: flush again
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
// Only the routes that need the proxy: short links and the API firewall. The
// page itself is static (no A/B test), and static files, /ingest (PostHog),
// /monitoring (Sentry tunnel) and /_vercel (Web Analytics / Speed Insights)
// never run it.
export const config = {
  matcher: ["/go/:path*", "/api/:path*"],
};
