// src/instrumentation-client.ts
// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Session Replay was removed: with replaysOnErrorSampleRate 1.0 it recorded
  // every visit in the background (~57 KB gzip plus main-thread work) on a
  // one-screen link page. Errors still arrive with full stack traces.
  integrations: [
    Sentry.feedbackIntegration({
      colorScheme: "system",
      // No floating button (it covered the support card on phones); the
      // footer's FeedbackButton opens the form via getFeedback().attachTo()
      autoInject: false,
    }),
    Sentry.consoleLoggingIntegration({
      levels: ["log", "info", "warn", "error"],
    }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Sentry v11: logs are on whenever Sentry.logger / consoleLoggingIntegration
  // is used (enableLogs is gone), and the default dataCollection already sends
  // what sendDefaultPii: true did (IP, cookies, headers, bodies). Set
  // dataCollection here to collect less.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
