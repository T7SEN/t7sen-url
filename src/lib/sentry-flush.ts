// src/lib/sentry-flush.ts
// Server-only: imports next/server's after(). Keep it out of logger.ts, which
// client components share.
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";

// after() starts on the response's 'close' event, before Next ends its root
// request span, and Sentry exports finished spans on a 1 ms debounce. Waiting
// briefly lets the route's transaction reach the buffer before the flush.
const SPAN_SETTLE_MS = 50;

/** Flush Sentry now (logs, spans, errors) and wait up to 2 s for delivery. */
export function flushSentry(): Promise<boolean> {
  return Sentry.flush(2000);
}

/**
 * Flush Sentry once the response has been sent.
 *
 * @sentry/nextjs 10.48 only registers its flush with Vercel's waitUntil on the
 * Edge runtime (getsentry/sentry-javascript#23087), so on the Node runtime the
 * buffered logs, spans and errors were lost when the function froze. after()
 * runs after the response and Vercel keeps the instance alive until it settles.
 * Call it at the start of every route handler and in the proxy. after()
 * callbacks run concurrently, so other after() work that can still report to
 * Sentry must call flushSentry() itself when it finishes.
 */
export function flushSentryAfterResponse(): void {
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, SPAN_SETTLE_MS));
    await flushSentry();
  });
}
