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
      // PostHog's own promoted date (its docs, onboarding and app use it)
      defaults: "2026-05-30",
      // 2026-05-30 delays storage writes by 250 ms, flushing only on unload.
      // /go reads the ph_<token>_posthog cookie on the click's own request
      // (target=_blank: no unload), so a session the click starts, or a first
      // visit's cookie, must already be written: keep this at 0
      persistence_save_debounce_ms: 0,
      capture_exceptions: true,
      debug: false,
      // Tag owner/preview traffic with the $internal_or_test_user person
      // property: local dev, preview deployments, and any browser that has
      // visited the site once with ?internal. PostHog only excludes it once
      // the cohort filter described in SKILL.md (Analytics) is set up.
      // *.vercel.app only on previews: production also answers on its
      // *.vercel.app alias, and those visitors are real. NEXT_PUBLIC_VERCEL_ENV
      // is set by Vercel at build time; unset (local) means not a preview.
      internal_or_test_user_hostname:
        process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
          ? /^(localhost|127\.0\.0\.1|.*\.vercel\.app)$/
          : /^(localhost|127\.0\.0\.1)$/,
      loaded: (ph) => {
        if (new URLSearchParams(window.location.search).has("internal")) {
          ph.setInternalOrTestUser();
        }
      },
    });
  }, []);

  return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
}
