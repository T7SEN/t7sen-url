// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import * as Sentry from "@sentry/nextjs";

// We define a static Map for instantaneous O(1) lookups at the Edge.
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

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 1. Safety Check: Only process /go/* routes
  if (!pathname.startsWith("/go/")) {
    return NextResponse.next();
  }

  const slug = pathname.replace("/go/", "").toLowerCase();
  const destination = redirectMap.get(slug);

  // 2. Fallback: If the slug doesn't exist, redirect to the homepage
  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Background Logging (Bypasses Sentry Issues Feed)
  console.info(`[Edge Redirect] Short Link Clicked: ${slug}`);

  // 4. Background Tracking: PostHog (Zero Latency Penalty)
  const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  if (posthogToken) {
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // event.waitUntil allows the background fetch to complete AFTER the redirect is sent to the user
    event.waitUntil(
      fetch("https://eu.i.posthog.com/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: posthogToken,
          // Use IP as a secure distinct_id for anonymous edge visitors
          distinct_id: ip,
          event: "short_link_clicked",
          properties: {
            slug,
            destination,
            $current_url: request.url,
            $lib: "edge-middleware",
          },
        }),
      }).catch((err) => {
        // Silently capture tracking failures so the user journey is never broken
        Sentry.captureException(err, {
          tags: { issue: "posthog_edge_fetch_failed" },
        });
      }),
    );
  }

  // 5. The Payload: Issue a 307 Temporary Redirect
  return NextResponse.redirect(destination, 307);
}

export const config = {
  matcher: [
    // Intercept everything starting with /go/
    "/go/:path*",
  ],
};
