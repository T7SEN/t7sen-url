<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# t7sen-url — Agent Guide

T7SEN's link-in-bio hub: a single fully static page (profile, live Twitch
card, links, support card) plus a `/go/<slug>` short-link redirect engine.
For architecture, subsystems, and the full landmines list, read `SKILL.md`
in the repo root.

## Stack

Next.js 16.3 (App Router, `cacheComponents`, `reactCompiler`) · React 19.3 ·
TypeScript 6 strict · Tailwind CSS v4 (CSS-configured, no JS config) ·
shadcn/ui (`base-nova`) · motion (`LazyMotion strict`) · SWR · next-themes ·
Sentry · PostHog (EU) · Vercel Web Analytics + Speed Insights. Package
manager: **npm**. Path alias `@/*` → `src/*`. No database, no auth — all
server state is in-memory.

## Commands

```
npm run dev
npm run build        # the real correctness gate
npm run lint
npx tsc --noEmit     # no type-check script exists
```

There are no tests and no pre-commit hooks. Run type-check, lint, and build
before declaring a change done.

## Layout

- `src/proxy.ts` — `/go/<slug>` redirects only (matcher: `/go/*`). The
  `/api/*` user-agent block and rate limit live in the Vercel Firewall
  (dashboard, not git; rules in SKILL.md).
- `src/config/links.ts` — the site URL (`siteUrl`), every outbound
  destination and `/go` slug (Twitch included), once.
- `src/config/profile.ts` — all profile content; links via `goUrl(slug)`.
- `src/app/page.tsx` — fully static page (footer year via `'use cache'`);
  `page-client.tsx` — the visible page.
- `src/app/api/` — `twitch` (live status + schedule), `og` (OG image),
  `health`. `src/app/manifest.ts` + `apple-icon.png` — web app manifest
  and iOS icon (PNGs from `scripts/generate-icons.mjs`).
- `src/components/` — feature components; `ui/` for primitives.
  `stream-status-provider.tsx` polls `/api/twitch` once for the page: read
  the live status with `useStreamStatus()` (the card, the avatar ring and
  `live-ambience.tsx` do), never a second `useSWR` on that key.
- `src/lib/logger.ts` — Sentry-backed logger; `src/lib/twitch.ts` — Helix
  live status (shared by `/api/twitch` and `/api/og`) and schedule;
  `src/lib/use-minute-clock.ts` — the time for client components.
- `assets/fonts/` — Space Grotesk TTFs (OFL) for the OG image only.

## Critical rules

- **Links live in `src/config/links.ts`.** Add a destination to `shortLinks`
  and point `profile.ts` at it with `goUrl("slug")` (a typo fails the
  type-check); the proxy and the JSON-LD read the same object. Don't hardcode
  URLs in components. Keep retired slugs in `slugAliases`.
- **`proxy.ts` runs on Node.js only** (Next 16). Do not rename it to
  `middleware.ts` or add an edge runtime export. **Don't add `/api` back to
  its matcher**: proxy code runs before the CDN cache, so every cached
  `/api/twitch` poll would run a function again. API protection belongs in
  the Vercel Firewall.
- **Keep `/` fully static.** No `headers()` / `cookies()` in the page; `Date`
  and randomness only inside a `'use cache'` function (or after request data
  under `<Suspense>`, which costs a function per view). In client components
  read the time with `useMinuteClock()`, never `Date.now()` in render.
- **Import motion as `m`:** `import { m as motion } from "motion/react"`.
  The full `motion` component throws under `LazyMotion strict`. Use
  `tw-animate-css` classes for entrance animations, and keep
  `prefers-reduced-motion` working (see SKILL.md Conventions).
- **No manual `useCallback` / `useMemo`** — React Compiler handles memoization.
- **New external script/fetch domain → update `csp` in `next.config.ts`.**
  Production allows no third-party origin today (PostHog via `/ingest`,
  Sentry via `/monitoring`).
- **New route handler (or proxy code) → call `flushSentryAfterResponse()`**
  from `src/lib/sentry-flush.ts`; otherwise its Sentry events are lost on
  Vercel's Node runtime. Never key PostHog events on the visitor's IP; use
  `src/lib/posthog-identity.ts`.
- **Keep `public/avatar.png`** — the OG route cannot read WebP.
- PostHog is initialized only in `PostHogProvider`; don't add a root
  `instrumentation-client.ts` or a second `posthog.init`.
- Never commit secrets. Env vars: `NEXT_PUBLIC_APP_URL`, `TWITCH_CLIENT_ID`,
  `TWITCH_CLIENT_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`,
  `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`, and `SENTRY_AUTH_TOKEN`
  (build-time source-map upload only).

## Conventions

Every interactive element gets the `#9146FF` focus-visible ring. Every
tracked click fires a PostHog event (`usePostHog()`, guarded) plus
`logger.info` with `tags.component`. External links use
`target="_blank" rel="noopener noreferrer"`. `src/` files start with a
`// src/path` header comment. Tailwind v4 class names (`bg-linear-to-r`).
Touch screens never hover (`hover:` is `@media (hover: hover)` in Tailwind
v4): give tappable elements an `active:` press state and hover effects a
touch counterpart (see SKILL.md Conventions).
`npm run lint` enforces the header, the motion import, no
`useCallback`/`useMemo`, error-first `logger.error`, Tailwind v4 gradient
names, no hardcoded URL `href`s and `rel="noopener noreferrer"` on every
`target="_blank"`; the focus ring and tracking are on you.
