// src/app/api/health/route.ts
import { NextResponse, connection } from "next/server";
import { logger } from "@/lib/logger";
import { flushSentryAfterResponse } from "@/lib/sentry-flush";

export async function GET() {
  try {
    // Without request data this handler would be prerendered at build time
    // (Cache Components); connection() keeps it running per request
    await connection();
    // after() needs a request scope, so register the flush once we're dynamic
    flushSentryAfterResponse();

    // Proactive Infrastructure Monitoring (reported to Sentry, not to the caller)
    const memoryUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    if (heapUsedMb > 500) {
      logger.warn("High memory usage detected in container", {
        tags: { layer: "infrastructure", component: "HealthEngine" },
        extra: {
          heapUsedMb,
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      });
    }

    // Public endpoint: report liveness only, no runtime details
    return NextResponse.json(
      { status: "ok" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error(error, {
      tags: { layer: "infrastructure", component: "HealthEngine" },
    });

    return NextResponse.json(
      { status: "unhealthy" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
