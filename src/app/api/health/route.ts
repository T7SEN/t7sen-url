// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    // Reading the request URL guarantees this bypasses the static build cache
    const url = new URL(request.url);
    const clientPing = url.searchParams.get("t") || "automated-ping";

    // Calculate precise container RAM usage
    const memoryUsage = process.memoryUsage();
    const formatMemoryUsage = (bytes: number) =>
      `${Math.round(bytes / 1024 / 1024)} MB`;

    const healthMetrics = {
      status: "healthy",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: `${Math.round(process.uptime())} seconds`,
      memory: {
        rss: formatMemoryUsage(memoryUsage.rss),
        heapTotal: formatMemoryUsage(memoryUsage.heapTotal),
        heapUsed: formatMemoryUsage(memoryUsage.heapUsed),
      },
      host: url.host,
      clientPing,
    };

    // Proactive Infrastructure Monitoring
    if (memoryUsage.heapUsed / 1024 / 1024 > 500) {
      logger.warn("High memory usage detected in container", {
        tags: { layer: "infrastructure", component: "HealthEngine" },
        extra: { memory: healthMetrics.memory },
      });
    }

    return NextResponse.json(healthMetrics, { status: 200 });
  } catch (error) {
    logger.error("Critical container health check failure", {
      tags: { layer: "infrastructure", component: "HealthEngine" },
      extra: { error },
    });

    return NextResponse.json(
      { status: "unhealthy", message: "Internal Server Error" },
      { status: 503 },
    );
  }
}
