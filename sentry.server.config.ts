// sentry.server.config.ts AND sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  // v11: logs need no flag, and the default dataCollection matches the old
  // sendDefaultPii: true (see src/instrumentation-client.ts)
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "info", "warn", "error"],
    }),
  ],
});
