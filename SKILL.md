---
name: t7sen-url
description: >-
  Architecture, conventions, and landmines for t7sen-url — T7SEN's Next.js 16
  link-in-bio hub with a live Twitch status card, a /go/<slug> short-link
  redirect engine, a proxy-driven A/B test, dynamic OG images, PostHog
  analytics, and Sentry. Consult this skill for any work in this repository:
  adding or changing links, editing proxy.ts, the Twitch or OG routes, the A/B
  test, analytics events, animations, theming, CSP, or deployment; debugging
  build, lint, or runtime errors. Use it even for small edits — links live in
  two places, proxy.ts is Node-only despite its "Edge" labels, and Cache
  Components plus LazyMotion strict mode fail in non-obvious ways.
---

# t7sen-url

A single-page link-in-bio site for T7SEN (streamer and developer): profile
header, live Twitch status card, a featured link, social icons, and an
A/B-tested support card — plus a server-side `/go/<slug>` short-link redirect
engine that tracks clicks. One page, but the request path runs through a
proxy layer, a streamed dynamic boundary, and three analytics/telemetry
channels. Small surface, tight coupling.

## Stack (resolved from package-lock.json)

- **Next.js 16.2.3** — App Router, `cacheComponents: true`, `reactCompiler: true`.
- **React 19.2.4**, **TypeScript 5.9**, strict. Path alias `@/*` → `src/*`.
- **Tailwind CSS 4.2** via `@tailwindcss/postcss`; configured in
  `src/app/globals.css`. No JS config file.
- **shadcn/ui**, style `base-nova` — mixes `@base-ui/react` (avatar) and
  `radix-ui` (`Slot` in button). Aceternity registry configured
  (`spotlight-new.tsx` came from it).
- **motion 12.38** (`motion/react`) under `LazyMotion strict` + `tw-animate-css`.
- **SWR 2.4** (Twitch polling only), **next-themes 0.4.6**, **lucide-react**.
- **Sentry 10.48** (`@sentry/nextjs`), **PostHog** (`posthog-js` 1.364,
  `posthog-node` 5.28), EU region.
- **Vercel Web Analytics** (`@vercel/analytics` 2.0) and **Speed Insights**
  (`@vercel/speed-insights` 2.0), rendered in `layout.tsx`.
- **npm** (package-lock.json committed).

There is **no database, no auth, no Redis, no persistent store**. All
server state (rate-limit counters, Twitch OAuth token) is in-memory per
process.

## Repository structure

```
src/
├── proxy.ts                 Request interception: firewall, /go redirects, A/B + geo
├── instrumentation.ts       Sentry server/edge registration + onRequestError
├── instrumentation-client.ts  Sentry browser init (replay, feedback, logs) — LIVE
├── config/profile.ts        All profile content: name, bio, links, socials, support
├── lib/
│   ├── logger.ts            Sentry-backed logger (info/warn/error/breadcrumb)
│   ├── posthog-server.ts    posthog-node client factory
│   └── utils.ts             cn()
├── app/
│   ├── layout.tsx           Fonts, metadata, OG URL, JSON-LD, provider tree
│   ├── page.tsx             Static shell + Suspense → dynamic A/B loader
│   ├── page-client.tsx      The entire visible page (client component)
│   ├── api/twitch/route.ts  Twitch Helix live-status endpoint
│   ├── api/og/route.tsx     Dynamic OG image (live badge aware)
│   ├── api/health/route.ts  Process health/memory metrics
│   ├── error.tsx, global-error.tsx, not-found.tsx
│   ├── robots.ts, sitemap.ts, icon.svg, globals.css
└── components/
    ├── twitch-card, primary-link-card, support-card, profile-header,
    │   copy-email-button, magnetic-wrapper, theme-toggle, icons
    ├── motion-provider, posthog-provider, theme-provider
    └── ui/                  button, avatar (unused), spotlight-background, spotlight-new
public/                      avatar.webp, avatar.png (OG only), twitch-banner.webp
instrumentation-client.ts    ROOT copy — fully commented out, dead (see Landmines)
sentry.server.config.ts, sentry.edge.config.ts
```

## Request flow

### 1. `src/proxy.ts` — runs on every non-static request

Next 16 renamed `middleware.ts` → `proxy.ts`, and **proxy runs on the Node.js
runtime only — Edge is not supported and not configurable.** The file's
"Edge Firewall" / "Edge Redirect" labels are historical (it was
`middleware.ts` until commit `e5d0117`). Matcher excludes `_next/static`,
`_next/image`, `_vercel` (Vercel analytics scripts and beacons), `favicon.ico`,
`sitemap.xml`, `robots.txt`.

- **Layer 1 — `/api/*` firewall.** User-agent blocklist (`BLOCKED_AGENTS`) →
  403. In-memory per-IP limiter: 10 requests / 60 s across **all** `/api/*`
  routes → 429 with `Retry-After: 60`. Map is swept when it exceeds 1000 keys.
- **Layer 2 — `/go/<slug>` redirects.** Slug is lowercased and looked up in
  `redirectMap`. Unknown slug → redirect to `/`. Known slug → fire-and-forget
  PostHog `short_link_clicked` via raw `fetch` to `eu.i.posthog.com` inside
  `event.waitUntil` (failures → Sentry), then **307** to the destination.
- **Layers 3 & 4 — geo + A/B.** Country from `cf-ipcountry` →
  `x-vercel-ip-country` → `"Global"`. Variant from cookie `support_copy_test`
  (`control` | `test`), randomly assigned if absent. Both are injected as
  **request** headers (`x-user-country`, `x-ab-variant`) and the cookie is
  re-set (30 days) on the response.

### 2. `src/app/page.tsx` — Cache Components shell

`Home` is a pure static shell: `<Suspense fallback={null}>` around
`DynamicVariantLoader`. The loader `await`s `headers()` (opting that boundary
into dynamic rendering), reads `x-ab-variant`, and only **then** calls
`new Date().getFullYear()` — under Cache Components, `Date`/random reads are
only legal after request data has been accessed. It renders `PageClient`
with `supportVariant` and `currentYear` props.

### 3. `src/app/page-client.tsx` — the visible page

Client component. Composes `SpotlightBackground` → glass card (cursor-tracked
purple border mask) → `ProfileHeader`, `TwitchCard`, primary links,
socials (email uses `CopyEmailButton`), then `SupportCard` and footer. The
A/B copy is decided here: `test` → "Buy me a Coffee ☕" / "Fuel the
late-night coding sessions"; `control` → `profileData.support` values.

## Subsystems

**Links and content.** All content lives in `src/config/profile.ts`
(`profileData`). Links and socials point at `/go/<slug>` (except email,
which is a direct `mailto:`); the real destinations live in `redirectMap`
in `proxy.ts`. The `twitter` social entry uses `/go/x`; both `twitter` and
`x` slugs exist in the map.

**Twitch live status.** `TwitchCard` polls `/api/twitch?channel=…` via SWR
(60 s interval, revalidate on focus, no retry); `undefined` data renders a
skeleton, error renders offline. The route validates the channel
(`/^[a-zA-Z0-9_]{2,25}$/`), gets a client-credentials token (cached at module
scope, refreshed 5 min before expiry), calls Helix `/streams` with a 5 s
`AbortController` timeout, and returns `{ isLive, game }` with
`Cache-Control: public, s-maxage=60, stale-while-revalidate=30`. Timeout →
**200** `{ isLive: false }` (graceful); any other failure → 500
`{ isLive: false }` + Sentry. Each call also fires server-side PostHog
`twitch_api_called` (new client per request, awaited `shutdown()`).

**OG image.** `/api/og` renders a 1200×630 `ImageResponse`. It self-fetches
`${NEXT_PUBLIC_APP_URL}/api/twitch` (`revalidate: 60`) to show a LIVE badge
with the game name. The avatar is swapped from `.webp` to `.png` because the
OG renderer cannot decode WebP. `layout.tsx` builds the OG URL from
`profileData.name` and a fixed subtitle; failures return a blank black image.

**Analytics (PostHog, EU).** Browser client is initialized in
`PostHogProvider`'s `useEffect` with `api_host: "/ingest"` (reverse-proxied
by `next.config.ts` rewrites to `eu.i.posthog.com` / `eu-assets.i.posthog.com`).
Event catalog:

| Event | Source |
|---|---|
| `primary_link_clicked` | `primary-link-card.tsx` |
| `social_link_clicked` | `page-client.tsx`, `copy-email-button.tsx` |
| `support_link_clicked` (with `ab_variant`) | `support-card.tsx` |
| `twitch_card_clicked` | `twitch-card.tsx` |
| `theme_toggled` | `theme-toggle.tsx` |
| `twitch_api_called` (server) | `api/twitch/route.ts` |
| `short_link_clicked` (proxy) | `proxy.ts` |

**Analytics (Vercel).** `<Analytics />` and `<SpeedInsights />` (from the
`/next` entry points) render at the end of `<body>` in `layout.tsx`. Both are
client components that wrap themselves in `<Suspense>`, so the static shell is
unaffected. Scripts and beacons are first-party under `/_vercel/*` (excluded
from the proxy matcher), and each feature must be enabled per project in the
Vercel dashboard or its script 404s. Hobby limits: Web Analytics 50k
events/month account-wide, page views only (no custom events); Speed Insights
10k events per rolling 30 days, Real Experience Score only — per-metric Core
Web Vitals come from Sentry tracing. Exceeding either pauses collection, not
the site.

**Observability (Sentry).** Org `t7sen` (formerly `t7sen-c0`), project
`links`, tunnel `/monitoring`. Server/edge init via `src/instrumentation.ts`;
browser init in `src/instrumentation-client.ts` (Session Replay with all
text/media masked, feedback widget, console-log capture). `src/lib/logger.ts`
wraps `Sentry.logger`; `logger.error(err, ctx)` also calls `captureException`.
`SENTRY_AUTH_TOKEN` is an org auth token with the org slug embedded, and
`sentry-cli` uses that slug over the `org` option — renaming the org breaks
source-map upload until a new token is issued. Local builds hide the failure
(`silent: !process.env.CI`); Vercel builds log it but do not fail.

**Health.** `/api/health` returns status, uptime, and process memory; warns to
Sentry above 500 MB heap. Note: it sits behind the proxy firewall (see
Landmines).

**Theming and visuals.** next-themes (`class` attribute, system default).
`ThemeToggle` uses the View Transitions API for a circular clip-path reveal;
the matching `::view-transition-*` rules live in `globals.css`. Visual
language: zinc palette, Twitch purple `#9146FF` accent, glassmorphism
(`backdrop-blur-xl`, translucent white/zinc-950), Space Grotesk + Geist Mono.

## Conventions

- **Content changes go through `profile.ts` + `redirectMap`** — never hardcode
  URLs in components.
- **Motion import:** `import { m as motion } from "motion/react"`. Required by
  `LazyMotion strict` (see Landmines).
- **Prefer CSS for entrance animations.** Commit `205d459` replaced motion
  entrances with `tw-animate-css` utilities:
  `animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-* duration-700`.
  Reserve motion for pointer-driven, spring, and presence (`AnimatePresence`)
  effects.
- **No manual `useCallback` / `useMemo`.** React Compiler is on; commit
  `8eb7666` removed them deliberately.
- **Every interactive element:** focus ring
  `focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950`.
- **Every tracked click:** `if (posthog) posthog.capture(...)` via
  `usePostHog()`, plus `logger.info(...)` with `tags.component`.
- **External links:** `target="_blank" rel="noopener noreferrer"`.
- **Pointer tracking:** cache `getBoundingClientRect()` on `mouseenter`, read
  the cache on `mousemove`, clear on `mouseleave` — never measure per move.
- **Logger:** pass the `Error` object first: `logger.error(err, { tags })`.
- **Tailwind v4 class names:** `bg-linear-to-r` (not `bg-gradient-to-r`).
- **File header:** `src/` files start with a `// src/path/to/file.tsx` comment.

## Environment variables

```
NEXT_PUBLIC_APP_URL                Canonical origin. Used by metadata, JSON-LD,
                                   robots, sitemap, and the OG self-fetch.
TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET   Helix client-credentials flow.
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN  Browser, proxy, and server PostHog.
NEXT_PUBLIC_POSTHOG_HOST           posthog-node host (server only).
NEXT_PUBLIC_SENTRY_DSN             All three Sentry runtimes.
```

Missing Twitch credentials → `/api/twitch` returns 500 and the card shows
offline. Missing PostHog token → proxy skips click tracking silently. Wrong
`NEXT_PUBLIC_APP_URL` → broken OG self-fetch and wrong canonical URLs.

## Commands

```
npm run dev      Dev server
npm run build    Production build — the real correctness gate
npm run start    Serve the build
npm run lint     ESLint 9 (next core-web-vitals + typescript)
npx tsc --noEmit Type-check (no script defined)
```

There are **no tests, no type-check script, and no pre-commit hooks**. Verify
every change with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Landmines — read before editing

1. **Links live in two places.** A link in `profile.ts` points at
   `/go/<slug>`; the destination lives in `redirectMap` in `proxy.ts`. Add or
   rename one without the other and the click silently redirects to `/` — no
   error, no 404.

2. **`proxy.ts` is Node-only.** Do not rename it back to `middleware.ts`, do
   not add `export const runtime = "edge"`, and do not trust its "Edge"
   comments. Its rate-limit `Map` and the Twitch token cache are **per
   process** — they reset on every deploy/restart and are not shared across
   instances. It is a soft limiter, not a security boundary.

3. **The firewall covers every `/api/*` route** — including `/api/health` and
   `/api/og`. Uptime monitors using `curl` or `python-requests` get **403**.
   The 10 req/min budget is shared per IP across all API routes. The OG
   route's self-fetch to `/api/twitch` also passes through it.

4. **Cache Components rules.** The `Home` shell must stay static. Never read
   `Date`, `Math.random`, `cookies()`, or `headers()` outside a Suspense
   boundary that has already accessed request data — the build fails or the
   page silently goes fully dynamic. New dynamic data = a new async component
   inside `<Suspense>`.

5. **LazyMotion strict + `domAnimation`.** Importing the full `motion`
   component (instead of `m`) throws at runtime under `strict`. `domAnimation`
   excludes layout animations and drag — those need `domMax` in
   `motion-provider.tsx`, which increases bundle size.

6. **CSP is strict for scripts and connections.** `script-src` and
   `connect-src` allow only self + PostHog EU. Any new script, fetch, or
   WebSocket domain must be added to `csp` in `next.config.ts` or the browser
   blocks it with only a console error. (`img-src` already allows any
   `https:`.) `next dev` alone also allows `https://va.vercel-scripts.com`
   (`vercelDevScripts`) for the Vercel analytics debug scripts; production
   serves them from `/_vercel/*`.

7. **Images are unoptimized.** `images.unoptimized: true` — `next/image` does
   not resize. Ship pre-sized assets. Keep `public/avatar.png`: the OG route
   depends on it because it cannot decode WebP.

8. **Two `instrumentation-client.ts` files.** `src/instrumentation-client.ts`
   (Sentry) is live. The **root** copy is fully commented-out PostHog init and
   is dead. Do not uncomment it — PostHog is already initialized in
   `PostHogProvider`, so re-enabling it double-initializes.

9. **`posthog-setup-report.md` is stale.** It describes `page.tsx` as a client
   component and lists a `link_clicked` event that no longer exists. Use the
   event table above as the source of truth.

10. **The dev-only `console.error` patch in `theme-provider.tsx` is
    intentional.** It suppresses React 19's "Encountered a script" warning
    from next-themes. Don't remove it, and don't extend it to hide other errors.

## Known tech debt — intentional vs. broken

**Genuine bugs (fix when touching the area):**
- `"postmanRuntime"` in `BLOCKED_AGENTS` never matches — the user agent is
  lowercased before comparison.
- `bg-grid-black/[0.02]` / `bg-grid-white/[0.02]` in `spotlight-background.tsx`
  are undefined utilities in Tailwind v4 (they required a v3 plugin) — they
  render nothing. `mini-svg-data-uri` is a leftover of that plugin.
- JSON-LD `sameAs` contains relative `/go/...` URLs; schema.org expects
  absolute URLs.
- `global-error.tsx` imports `Error` from `next/error`, shadowing the global
  `Error` type used in its own props interface.
- `proxy.ts` uses the raw `x-forwarded-for` value (possibly a comma list) as
  the rate-limit key; `api/twitch` correctly takes the first entry.

**Dead code:** `components/ui/avatar.tsx`, the `.scroll-reveal` utility in
`globals.css`, `Icons.code`, the root `instrumentation-client.ts`, the
`x-user-country` request header (injected, never read), and the
`autoprefixer` and `@tailwindcss/cli` dependencies (unused — Tailwind v4
handles prefixing). `critters` is installed for `optimizeCss`; verify current
Next behavior before removing it.

**Cost and privacy choices to flag before changing:** `tracesSampleRate: 1`
in all three Sentry runtimes; `sendDefaultPii: true`; PostHog `distinct_id`
is the raw client IP in both `proxy.ts` and `api/twitch`; server PostHog
awaits `shutdown()` per request (adds latency to `/api/twitch`).

**Intentional — don't "fix":** Twitch timeout returns 200 offline;
`images.unoptimized`; in-memory state; A/B copy hardcoded in
`page-client.tsx`; `ThemeToggle` importing the `posthog` singleton (works,
though `usePostHog()` is the pattern elsewhere).

**Housekeeping:** `README.md` is create-next-app boilerplate;
`eslint-config-next` (16.2.2) trails `next` (16.2.3).

## Before you finish a change

- New or renamed link → `profile.ts` **and** `redirectMap` updated together.
- New external domain → `csp` in `next.config.ts`.
- New dynamic data on the page → async component inside `<Suspense>`; shell
  stays static.
- New animation → CSS first; motion only via `m`, and only for interactive
  effects.
- New tracked interaction → PostHog event (add it to the event table here) +
  `logger.info`.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.
