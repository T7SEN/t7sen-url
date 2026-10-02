// src/components/posthog-provider.tsx
"use client";

import * as React from "react";
import posthog from "posthog-js";
import { PostHogProvider as CSPostHogProvider } from "posthog-js/react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: false,
      // Tag owner/preview traffic with the $internal_or_test_user person
      // property: local dev, Vercel preview URLs, and any browser that has
      // visited the site once with ?internal. PostHog only excludes it once
      // the cohort filter described in SKILL.md (Analytics) is set up.
      internal_or_test_user_hostname: /^(localhost|127\.0\.0\.1|.*\.vercel\.app)$/,
      loaded: (ph) => {
        if (new URLSearchParams(window.location.search).has("internal")) {
          ph.setInternalOrTestUser();
        }
      },
    });
  }, []);

  return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
}
