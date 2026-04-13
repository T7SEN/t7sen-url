// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import * as Sentry from "@sentry/nextjs";

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
const BLOCKED_AGENTS = ["python-requests", "curl", "postmanRuntime", "scrapy"];

// =========================================================
// 2. MIDDLEWARE ENGINE
// =========================================================

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

  // ---------------------------------------------------------
  // LAYER 1: THE EDGE FIREWALL (Protects /api/*)
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
  }

  // ---------------------------------------------------------
  // LAYER 2: THE REDIRECT ENGINE (Handles /go/*)
  // ---------------------------------------------------------
  if (pathname.startsWith("/go/")) {
    const slug = pathname.replace("/go/", "").toLowerCase();
    const destination = redirectMap.get(slug);

    if (!destination) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Kept as console.info so it stays in Logs and doesn't spam your Issues feed
    console.info(`[Edge Redirect] Short Link Clicked: ${slug}`);

    const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (posthogToken) {
      event.waitUntil(
        fetch("https://eu.i.posthog.com/capture/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: posthogToken,
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
          // 🚀 Restored explicitly to keep your custom tags intact
          Sentry.captureException(err, {
            tags: { issue: "posthog_edge_fetch_failed" },
          });
        }),
      );
    }

    return NextResponse.redirect(destination, 307);
  }

  return NextResponse.next();
}

// =========================================================
// 3. MATCHER CONFIGURATION
// =========================================================
export const config = {
  matcher: ["/go/:path*", "/api/:path*"],
};
