<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the t7sen-url Next.js App Router project.

## Summary of changes

- **`instrumentation-client.ts`** (new) — Client-side PostHog initialization using `posthog-js`. Runs automatically in Next.js 16 via the instrumentation hook. Captures unhandled exceptions via `capture_exceptions: true` and routes events through a reverse proxy at `/ingest`.
- **`next.config.ts`** — Added reverse proxy rewrites (`/ingest/*` → `https://eu.i.posthog.com/*`) and `skipTrailingSlashRedirect: true` to improve event delivery reliability and reduce tracking blocker interference.
- **`src/lib/posthog-server.ts`** (new) — Server-side PostHog client using `posthog-node` with `flushAt: 1` and `flushInterval: 0` for immediate event flushing from Next.js API routes.
- **`.env.local`** — Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables.
- **`src/app/page.tsx`** — Converted to a client component (`"use client"`) and added `posthog.capture` calls on primary link and social link clicks.
- **`src/components/theme-toggle.tsx`** — Added `posthog.capture('theme_toggled')` in the toggle handler, recording the new theme value.
- **`src/components/twitch-card.tsx`** — Added `posthog.capture('twitch_card_clicked')` on the Twitch card anchor, recording the channel name and live status.
- **`src/app/api/twitch/route.ts`** — Added server-side `posthog.capture('twitch_api_called')` after each Twitch stream status check, recording the channel and whether they are live.

## Events

| Event | Description | File |
|---|---|---|
| `link_clicked` | Fired when a user clicks a primary profile link (Portfolio, Personal Website) | `src/app/page.tsx` |
| `social_link_clicked` | Fired when a user clicks a social icon link (GitHub, LinkedIn, Twitter/X, Email) | `src/app/page.tsx` |
| `twitch_card_clicked` | Fired when a user clicks the Twitch card to visit the Twitch channel | `src/components/twitch-card.tsx` |
| `theme_toggled` | Fired when a user switches between light and dark mode | `src/components/theme-toggle.tsx` |
| `twitch_api_called` | Server-side: fired when the Twitch stream status API route is called, including the result (live/offline) | `src/app/api/twitch/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/153928/dashboard/605451
- **Overall Link Engagement** (primary links, social, Twitch card combined): https://eu.posthog.com/project/153928/insights/DBAJKRL6
- **Link Clicks by Destination** (broken down by link title): https://eu.posthog.com/project/153928/insights/GLNIfVCA
- **Social Link Clicks by Platform** (broken down by platform): https://eu.posthog.com/project/153928/insights/BwxbRruC
- **Twitch Card Clicks (Live vs Offline)**: https://eu.posthog.com/project/153928/insights/Gn3yaIDR
- **Twitch Live Status Checks** (server-side, live vs offline): https://eu.posthog.com/project/153928/insights/24HPGfnO

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
