---
name: t7sen-url
description: >-
  Architecture, conventions, and landmines for t7sen-url — T7SEN's Next.js 16
  link-in-bio hub with a live Twitch status card, a /go/<slug> short-link
  redirect engine, a fully static page, dynamic OG images, PostHog
  analytics, and Sentry. Consult this skill for any work in this repository:
  adding or changing links, editing proxy.ts, the Twitch or OG routes,
  analytics events, animations, theming, CSP, or deployment; debugging
  build, lint, or runtime errors. Use it even for small edits — links live in
  two places, proxy.ts is Node-only despite its "Edge" labels, and Cache
  Components plus LazyMotion strict mode fail in non-obvious ways.
---

# t7sen-url

A single-page link-in-bio site for T7SEN (streamer and developer): profile
header, live Twitch status card, a featured link, social icons, and a
support card — plus a server-side `/go/<slug>` short-link redirect engine
that tracks clicks. The page is prerendered and served from the CDN; the
proxy only handles `/go` and `/api`, and several analytics/telemetry channels
run alongside. Small surface, tight coupling.

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
├── proxy.ts                 Request interception: /api firewall, /go redirects
├── instrumentation.ts       Sentry server/edge registration + onRequestError
├── instrumentation-client.ts  Sentry browser init (feedback [footer link], logs; no replay) — LIVE
├── config/profile.ts        All profile content: name, bio, links, socials, support
├── lib/
│   ├── logger.ts            Sentry-backed logger (info/warn/error/breadcrumb)
│   ├── posthog-server.ts    posthog-node client factory
│   ├── posthog-identity.ts  Browser PostHog ID from its cookie for server-side events
│   ├── sentry-flush.ts      flushSentryAfterResponse(): Sentry.flush in after() (server-only)
│   ├── twitch.ts            Helix live status + token cache (used by /api/twitch and /api/og)
│   └── utils.ts             cn()
├── app/
│   ├── layout.tsx           Fonts, metadata, OG URL, JSON-LD, provider tree
│   ├── page.tsx             Fully static page; footer year via 'use cache' (daily)
│   ├── page-client.tsx      The entire visible page (client component)
│   ├── api/twitch/route.ts  Twitch Helix live-status endpoint
│   ├── api/og/route.tsx     Dynamic OG image (live badge aware)
│   ├── api/health/route.ts  Liveness only ({ status: "ok" }); heap warning → Sentry
│   ├── error.tsx, global-error.tsx, not-found.tsx
│   ├── robots.ts, sitemap.ts, icon.svg, globals.css
└── components/
    ├── twitch-card, primary-link-card, support-card, profile-header,
    │   copy-email-button, share-profile-button, feedback-button,
    │   magnetic-wrapper, theme-toggle, icons, json-ld
    ├── motion-provider, posthog-provider, theme-provider
    └── ui/                  button, avatar (unused), spotlight-background, spotlight-new
public/                      avatar.webp, avatar.png (OG only), twitch-banner.webp
assets/fonts/                Space Grotesk Medium/Bold TTFs + OFL.txt (OG image only)
instrumentation-client.ts    ROOT copy — fully commented out, dead (see Landmines)
sentry.server.config.ts, sentry.edge.config.ts
```

## Request flow

### 1. `src/proxy.ts` — runs on `/go/*` and `/api/*` only

Next 16 renamed `middleware.ts` → `proxy.ts`, and **proxy runs on the Node.js
runtime only — Edge is not supported and not configurable.** The file's
"Edge Firewall" / "Edge Redirect" labels are historical (it was
`middleware.ts` until commit `e5d0117`). Matcher is
`["/go/:path*", "/api/:path*"]`: the page, static files, `/ingest` (PostHog),
`/monitoring` (Sentry tunnel) and `/_vercel` (Vercel analytics) never run it.
Hosted on Vercel with DNS-only records (no Cloudflare proxy), so the client IP
comes from `x-real-ip` and the country from `x-vercel-ip-country` →
`"Global"`. `cf-ipcountry` is deliberately ignored (spoofable without
Cloudflare in front).

- **Layer 1 — `/api/*` firewall.** User-agent blocklist (`BLOCKED_AGENTS`,
  lowercase) → 403. In-memory per-IP limiter: 10 requests / 60 s across the
  `/api/*` routes → 429 with `Retry-After: 60`, **except the card's exact poll
  URL `/api/twitch?channel=<profileData.twitchChannel>`** (visitors behind one
  NAT/CGNAT IP all poll it every minute and the 11th tab got a 429; that URL
  is CDN-cached 60 s and memoised 30 s). Any other query on `/api/twitch`
  misses the CDN cache, so it keeps the budget. Map is
  swept when it exceeds 1000 keys. Passing requests return
  `NextResponse.next()` untouched.
- **Layer 2 — `/go/<slug>` redirects.** Slug is lowercased with trailing
  slashes stripped (`skipTrailingSlashRedirect` is on) and looked up in
  `redirectMap`. Unknown slug → `console.warn` + redirect to `/`. Known slug →
  **307** to the destination for every method and agent; PostHog
  `short_link_clicked` (raw `fetch` to `eu.i.posthog.com` inside
  `event.waitUntil`; network errors and non-2xx answers → Sentry) fires only
  for `GET` requests with a
  user agent that is not a bot (`userAgent().isBot`, `/\bbot\b/`,
  `NON_HUMAN_AGENTS`) and not a prefetch (`Sec-Purpose`/`Purpose`), so
  unfurlers, HEAD probes, crawlers and HTTP clients are not counted.

The former `support_copy_test` A/B test (layers 3 & 4: variant cookie plus
`x-ab-variant` / `x-user-country` headers) was removed: it never recorded
exposure and the traffic could not produce a result. Old cookies expire on
their own.

### 2. `src/app/page.tsx` — fully static page

`Home` reads no request data, so `/` is prerendered (`○` in the build output)
and served from the CDN with no function or proxy invocation per view. The
only time-dependent value, the footer year, comes from `getCurrentYear()`
(`'use cache'` + `cacheLife("days")`); under Cache Components a `Date` read
must be cached or follow request data, and this makes the page revalidate
daily. It renders `PageClient` with a `currentYear` prop.

### 3. `src/app/page-client.tsx` — the visible page

Client component. Composes `SpotlightBackground` → top bar (`ShareProfileButton`
left, `ThemeToggle` right) → glass card (cursor-tracked purple border mask) →
`ProfileHeader`, `TwitchCard`, primary links, socials (email uses
`CopyEmailButton`), then `SupportCard` (copy from `profileData.support`) and
footer. `main` is `min-h-dvh` and the page scrolls only when content is taller
than the screen: a `flex-1` wrapper centres the column and pushes the footer
(normal flow, `py-4`) to the bottom, so nothing ever covers the support card.
The top bar is `absolute inset-x-4 top-4`; below `md` it would sit over the
column, so the wrapper has `pt-20` (bar height `h-10`, `sm:h-12` — change them
together); from `md` up the buttons sit beside the centred `max-w-lg` column,
so `md:pt-8`. The bar is `pointer-events-none` with `*:pointer-events-auto`
so its empty middle never blocks hover on the card beneath it on short
screens. Wide-but-short screens use the `short:` variant (defined in
`globals.css`: ≥768px wide, ≤940px tall) to tighten spacing, the avatar and
the Twitch banner: content is ~899px at full size and ~727px compact, so wide
windows ≥727px tall fit without a scrollbar (a 1366×768 laptop's ~650px
viewport still scrolls ~77px); phones scroll. `<body>` is `min-h-dvh`, not
`min-h-screen` (100vh is the toolbar-hidden height on mobile and forces a
phantom scroll). Entrances are CSS (`tw-animate-css`) staggered by
per-element delays, so the server HTML paints without waiting for JS; the
support card's entrance sits on its shadowed wrapper in `page-client.tsx`.

## Subsystems

**Links and content.** All content lives in `src/config/profile.ts`
(`profileData`). Links and socials point at `/go/<slug>` (except email,
which is a direct `mailto:`); the real destinations live in `redirectMap`
in `proxy.ts`. The `twitter` social entry uses `/go/x`; both `twitter` and
`x` slugs exist in the map.

**Twitch live status.** `TwitchCard` polls `/api/twitch?channel=…` via SWR
(60 s interval, revalidate on focus throttled to 30 s). The fetcher throws on
non-2xx, so a 429/500 never overwrites good data: the card shows the last
known status, a skeleton before the first response, and a neutral "Status
unknown" badge (not "Offline") when it has no data because the first
fetch failed. The skeleton renders the real channel name and tagline (static
from `profile.ts`) so it has the loaded card's height at every width; only
the badge, icon, arrow and banner pulse, and on load only the badge, icon
tile and arrow fade in (the root has no fade, which blinked the text). SWR pauses `refreshInterval` while
an error is cached, so `onErrorRetry` retries every 60 s to keep polling,
with **one** pending retry timer (while the page is visible and online, SWR
calls `onErrorRetry` after every failed request it starts, focus
revalidations included, so a timer per call stacked parallel retry loops; a
failure in a hidden tab schedules nothing and focus revalidation resumes
polling); `onSuccess` and unmount clear it. HTTP errors are logged as
warnings (the server already reports 5xx), network errors as errors. The
route validates the channel (`/^[a-zA-Z0-9_]{2,25}$/`), answers only for
`profileData.twitchChannel` (400 otherwise), and calls `getStreamStatus()`
from `src/lib/twitch.ts`. That helper holds the client-credentials token
(module scope, refreshed 5 min before expiry, one in-flight refresh shared by
concurrent requests; on a Helix 401 it clears that token only if it is still
the cached one, then retries once), calls Helix `/streams` with
`cache: "no-store"` and a 5 s `AbortController` timeout per call that also
covers reading the body, and memoises `{ isLive, game }` per instance for
30 s with one in-flight Helix request shared by concurrent callers. Don't put
Helix back on Next's fetch data cache: its stale-while-revalidate served old
bodies and hid 401s. The route responds with
`Cache-Control: public, s-maxage=60, stale-while-revalidate=30`. Timeout →
**200** `{ isLive: false }` (graceful); missing credentials
(`TwitchConfigError`) or any other failure → 500 `{ isLive: false }` + Sentry.
Each call also fires server-side PostHog `twitch_api_called` when the
PostHog token is set (new client per request; `shutdown()` runs in
`after()`, so the response never waits on PostHog).

**OG image.** `/api/og` renders a 1200×630 `ImageResponse` with **fixed text
only** (`profileData.name`, `profileData.ogSubtitle`, the Twitch tagline or
LIVE badge) — it ignores query params, so nobody can mint branded images on
this domain; `layout.tsx` points `og:image` at plain `/api/og`. It calls
`getStreamStatus()` directly (no self-fetch through the CDN/proxy/firewall),
capped at 2.5 s so crawlers get an image without the badge rather than a
timeout; a call that loses that race is kept alive with `after()` so it
still fills the caches. Game names longer than 36 characters are truncated
with an ellipsis. The avatar (`public/avatar.png`, since the renderer cannot
decode WebP) is read from disk once per instance and inlined as a data URL
(it used to be fetched over HTTP from the request origin, which Vercel
Deployment Protection refuses on preview URLs); on failure the initials are
drawn instead. Fonts are static Space
Grotesk Medium/Bold TTFs in `assets/fonts/` (OFL-1.1, `OFL.txt` alongside),
read with `readFile(join(process.cwd(), ...))` so Next traces them into the
function; next/og only bundles Geist Regular and cannot read woff2. If they
fail to load it falls back to Geist. No emoji (satori fetches emoji images
from a CDN per render). Responses carry `public, max-age=0, s-maxage=300`
with **no** stale-while-revalidate (it would serve a go-live share the
previous offline render), so the LIVE badge lags at most ~5.5 min (CDN plus
the 30 s status memo). Degraded renders (badge dropped after a Twitch
timeout/error, initials instead of the avatar, Geist instead of Space
Grotesk) and the blank error image are cached only 60 s.

**Analytics (PostHog, EU).** Browser client is initialized in
`PostHogProvider`'s `useEffect` with `api_host: "/ingest"` (reverse-proxied
by `next.config.ts` rewrites to `eu.i.posthog.com` / `eu-assets.i.posthog.com`;
a relative `api_host` makes posthog-js send every API and asset request
there, so the CSP needs no PostHog origin; the one exception is the PostHog
toolbar, see landmine 6). Owner/preview traffic is tagged with the
`$internal_or_test_user` person property (`internal_or_test_user_hostname`
for localhost, plus `*.vercel.app` only when `NEXT_PUBLIC_VERCEL_ENV` is
`preview` — production also answers on its `*.vercel.app` alias and those
visitors are real; plus `setInternalOrTestUser()` after one visit with
`?internal`). **Tagging alone excludes nothing.** One-time PostHog
setup: create a cohort "Internal/test users" where person property
`$internal_or_test_user` is set, then in Project settings → "Filter out
internal and test users" add "Cohort not in Internal/test users" (a cohort,
not a person-property filter, so the personless server events from the same
`distinct_id` are excluded too), and turn the filter on in insights.

Server-side events (`short_link_clicked`, `twitch_api_called`) never use the
visitor's IP: `src/lib/posthog-identity.ts` reads the browser's own
anonymous ID and session from its first-party `ph_<token>_posthog` cookie, so
those events join the visitor's session (random UUID when there is no cookie;
the session ID only while it is still live by posthog-js's rules — 30 min
idle, 24 h max — since the cookie keeps an expired `$sesid` until the next
browser event), and adds `$process_person_profile: false` (no person profiles, matching
posthog-js `identified_only`) and `$geoip_disable: true` (PostHog would
geolocate Vercel's server). Only `short_link_clicked` carries a location
(`country`, from `x-vercel-ip-country`) and `$referrer`; `twitch_api_called`
has none (posthog-node never sent GeoIP either).

Event catalog:

| Event | Source |
|---|---|
| `primary_link_clicked` | `primary-link-card.tsx` |
| `social_link_clicked` | `page-client.tsx`, `copy-email-button.tsx` (with `method`: `clipboard` \| `mailto_fallback`) |
| `profile_shared` (with `method`: `native` \| `clipboard`, after the share succeeds) | `share-profile-button.tsx` |
| `support_link_clicked` | `support-card.tsx` |
| `twitch_card_clicked` (`is_live`: `true` | `false` | `null` when the status is unknown) | `twitch-card.tsx` |
| `theme_toggled` | `theme-toggle.tsx` |
| `feedback_opened` (only when the Sentry form is attached, i.e. a DSN is set) | `feedback-button.tsx` |
| `twitch_api_called` (server) | `api/twitch/route.ts` |
| `short_link_clicked` (proxy) | `proxy.ts` |

**Analytics (Vercel).** `<Analytics />` and `<SpeedInsights />` (from the
`/next` entry points) render at the end of `<body>` in `layout.tsx`. Both are
client components that wrap themselves in `<Suspense>`, so the static page is
unaffected. Scripts and beacons are first-party under `/_vercel/*` (excluded
from the proxy matcher), and each feature must be enabled per project in the
Vercel dashboard or its script 404s. Hobby limits: Web Analytics 50k
events/month account-wide, page views only (no custom events); Speed Insights
10k events per rolling 30 days, Real Experience Score only — per-metric Core
Web Vitals come from Sentry tracing. Exceeding either pauses collection, not
the site.

**Observability (Sentry).** Org `t7sen` (formerly `t7sen-c0`), project
`links`, tunnel `/monitoring`. Server/edge init via `src/instrumentation.ts`;
browser init in `src/instrumentation-client.ts`: no Session Replay (removed —
it recorded every visit in the background), the feedback integration with
`autoInject: false` (the floating button covered the support card on phones;
the footer's `FeedbackButton` opens the form via
`Sentry.getFeedback()?.attachTo()`), and console-log capture.
`sendDefaultPii: true` is kept deliberately in all three runtimes.
`src/lib/logger.ts` wraps `Sentry.logger`; `logger.error(err, ctx)` also calls
`captureException`.

**Server-side flushing.** `@sentry/nextjs` 10.48 only registers its flush
with Vercel's `waitUntil` on the Edge runtime (getsentry/sentry-javascript
#23087), so on Node the buffered logs, spans and errors were lost when the
function froze. Every route handler and the proxy call
`flushSentryAfterResponse()` (`src/lib/sentry-flush.ts`, server-only — don't
import it from `logger.ts`), which runs `Sentry.flush(2000)` in `after()`
after a 50 ms pause: `after()` starts on the response's `close` event, before
Next ends its root request span, and Sentry exports finished spans on a 1 ms
debounce. `after()` callbacks run concurrently, so other `after()` work that
can still log (the PostHog `shutdown()` in `/api/twitch`, the OG route's
budget-losing Twitch call) calls `flushSentry()` when it finishes. Server
traces at `tracesSampleRate: 1` are now delivered, so they count against the
Sentry quota. The feedback form returns focus to the footer link on close
and submit (it never restores focus itself).
`SENTRY_AUTH_TOKEN` is an org auth token with the org slug embedded, and
`sentry-cli` uses that slug over the `org` option — renaming the org breaks
source-map upload until a new token is issued. Local builds hide the failure
(`silent: !process.env.CI`); Vercel builds log it but do not fail.

**Health.** `/api/health` returns only `{ status: "ok" }` (`no-store`); it
calls `connection()` so Cache Components does not prerender it, and warns to
Sentry above 500 MB heap. Note: it sits behind the proxy firewall (see
Landmines).

**Theming and visuals.** next-themes (`class` attribute, system default).
`ThemeToggle` uses the View Transitions API for a circular clip-path reveal;
the matching `::view-transition-*` rules live in `globals.css`. Visual
language: zinc palette, Twitch purple `#9146FF` accent, glassmorphism
(`backdrop-blur-xl`, translucent white/zinc-950), Space Grotesk (the only
font; `font-mono` falls back to Tailwind's default stack).

## Conventions

- **Content changes go through `profile.ts` + `redirectMap`** — never hardcode
  URLs in components.
- **Motion import:** `import { m as motion } from "motion/react"`. Required by
  `LazyMotion strict` (see Landmines).
- **CSS for entrance animations.** All page entrances (page-client, error,
  not-found) use `tw-animate-css` utilities:
  `animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-* duration-700`.
  Reserve motion for pointer-driven, spring, and presence (`AnimatePresence`)
  effects. `delay-*` / `duration-*` also set `transition-delay` /
  `transition-duration`, so put entrance delays on a wrapper that has no hover
  transitions of its own.
- **Reduced motion is honoured.** `MotionConfig reducedMotion="user"` in
  `motion-provider.tsx` stops motion transform animations; a
  `prefers-reduced-motion` block in `globals.css` collapses CSS
  animations/transitions (tw-animate-css has none); `MagneticWrapper` and
  `SpotlightBackground` check `useReducedMotion()` in handlers/effects (never
  in render, to avoid hydration mismatches); `ThemeToggle` skips the View
  Transition reveal.
- **No manual `useCallback` / `useMemo`.** React Compiler is on; commit
  `8eb7666` removed them deliberately.
- **Every interactive element:** focus ring
  `focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950`.
- **Every tracked click:** `if (posthog) posthog.capture(...)` via
  `usePostHog()`, plus `logger.info(...)` with `tags.component`.
- **External links:** `target="_blank" rel="noopener noreferrer"`.
- **Pointer tracking:** cache `getBoundingClientRect()` on `mouseenter` in
  **page coordinates** (`rect.left + scrollX`, `rect.top + scrollY`), read it
  on `mousemove` with `pageX`/`pageY`, clear on `mouseleave` — never measure
  per move. The page scrolls, so viewport coordinates would go stale.
- **Logger:** pass the `Error` object first: `logger.error(err, { tags })`.
- **Tailwind v4 class names:** `bg-linear-to-r` (not `bg-gradient-to-r`).
- **`short:` variant for vertical rhythm.** Anything that adds height to the
  page needs a `short:` value too, or wide laptops get a scrollbar again.
  Keep the skeleton and loaded Twitch card sizes in sync (no layout shift).
- **File header:** `src/` files start with a `// src/path/to/file.tsx` comment.

## Environment variables

```
NEXT_PUBLIC_APP_URL                Canonical origin. Used by metadata, JSON-LD,
                                   robots, sitemap, the OG image's domain line,
                                   and the Share button's URL (inlined into the
                                   client bundle at build time).
TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET   Helix client-credentials flow.
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN  Browser, proxy, and server PostHog.
NEXT_PUBLIC_POSTHOG_HOST           posthog-node host (server only).
NEXT_PUBLIC_SENTRY_DSN             All three Sentry runtimes.
```

Missing Twitch credentials → `/api/twitch` returns 500 and the card shows
"Status unknown". Missing PostHog token → the proxy and `/api/twitch`
skip their server events silently. Wrong `NEXT_PUBLIC_APP_URL` → wrong
canonical/OG URLs (link previews break) and the Share button hands out the
wrong link. `NEXT_PUBLIC_VERCEL_ENV` is set by Vercel itself at build time
(framework environment variable, not in `.env.local`); `PostHogProvider`
reads it to tag preview traffic.

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
   The 10 req/min budget is shared per IP across the API routes except the
   card's exact `/api/twitch` poll URL, which is exempt (shared-IP visitors
   tripped it; see Layer 1). The OG route calls `src/lib/twitch.ts`
   directly, never `/api/twitch`. `/api/twitch` answers only for
   `profileData.twitchChannel`; any other channel is a 400. Every poll still
   runs the proxy (Routing Middleware runs before the CDN cache).

4. **Cache Components rules.** `/` is fully static — keep it that way. Never
   read `cookies()` or `headers()` in the page, and read `Date` /
   `Math.random` only inside a `'use cache'` function (as `getCurrentYear()`
   does) or after request data inside a `<Suspense>` boundary — otherwise the
   build fails or the page silently becomes dynamic (a function per view). In
   client components (everything under `page-client.tsx`) don't read them
   during render either: use `useEffect`/event handlers, or compute on the
   server and pass a prop as `currentYear` does. New per-request data = a new
   async component inside `<Suspense>`, which brings back a function
   invocation per view on Vercel Hobby.

5. **LazyMotion strict + `domAnimation`.** Importing the full `motion`
   component (instead of `m`) throws at runtime under `strict`. `domAnimation`
   excludes layout animations and drag — those need `domMax` in
   `motion-provider.tsx`, which increases bundle size.

6. **CSP allows no third-party script or connection origin in production.**
   `script-src` is `'self' 'unsafe-inline'` (Next's inline bootstrap; nonces
   would make the static page dynamic) and `connect-src` is `'self'`: PostHog
   goes through `/ingest`, Sentry through `/monitoring`. Any new script,
   fetch, or WebSocket domain must be added to `csp` in `next.config.ts` or
   the browser blocks it with only a console error. (`img-src` already allows
   any `https:`.) Environment-specific additions: `next dev` adds
   `'unsafe-eval'` and `https://va.vercel-scripts.com` (Vercel analytics debug
   scripts); Vercel **preview** builds (`VERCEL_ENV=preview`) add the Vercel
   Toolbar origins (`vercel.live`, `wss://ws-us3.pusher.com`,
   `assets.vercel.com`, `frame-src https://vercel.live`); Vercel
   production/preview builds (`VERCEL_ENV`, not `VERCEL`, which `vercel dev`
   and `vercel env pull` also set locally) add `upgrade-insecure-requests`,
   kept off locally because it would break `http://` testing. `form-action
   'self'` is always set. Known exception: the PostHog toolbar (launched from
   the PostHog app for heatmaps/actions) calls `ui_host`
   `https://eu.posthog.com` directly and is blocked by `connect-src`; add that
   origin (preview-only is enough) if the toolbar is ever needed.

7. **Images are unoptimized.** `images.unoptimized: true` — `next/image` does
   not resize. Ship pre-sized assets. Keep `public/avatar.png`: the OG route
   reads it from disk because it cannot decode WebP. Above-the-fold images use
   `loading="eager"` + `fetchPriority="high"`; `priority` is deprecated in
   Next 16, and its replacement `preload` must not be combined with
   `fetchPriority`.

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
- `bg-grid-black/[0.02]` / `bg-grid-white/[0.02]` in `spotlight-background.tsx`
  are undefined utilities in Tailwind v4 (they required a v3 plugin) — they
  render nothing. `mini-svg-data-uri` is a leftover of that plugin.
- JSON-LD `sameAs` contains relative `/go/...` URLs; schema.org expects
  absolute URLs.
- `global-error.tsx` imports `Error` from `next/error`, shadowing the global
  `Error` type used in its own props interface.

**Dead code:** `components/ui/avatar.tsx`, the `.scroll-reveal` utility in
`globals.css`, `Icons.code`, the root `instrumentation-client.ts`, and the
`autoprefixer` and `@tailwindcss/cli` dependencies (unused — Tailwind v4
handles prefixing). `critters` is installed for `optimizeCss`; verify current
Next behavior before removing it.

**Cost and privacy choices to flag before changing:** `tracesSampleRate: 1`
in all three Sentry runtimes (server traces are now really delivered, see
Server-side flushing); `sendDefaultPii: true` (kept on purpose: Sentry gets
visitor IPs, cookies and headers); no consent banner gates PostHog's
first-party cookie.

**Intentional — don't "fix":** Twitch timeout returns 200 offline;
`images.unoptimized`; in-memory state; `ThemeToggle` importing the
`posthog` singleton (works, though `usePostHog()` is the pattern elsewhere);
`PrimaryLinkCard` keeping `delay-500 duration-700` on its anchor, which also
delays and slows its hover transition (left as is so the featured card's
staged hover reveal keeps its timing).

**Housekeeping:** `README.md` is create-next-app boilerplate;
`eslint-config-next` (16.2.2) trails `next` (16.2.3).

## Before you finish a change

- New or renamed link → `profile.ts` **and** `redirectMap` updated together.
- New external domain → `csp` in `next.config.ts`.
- New data on the page → static or `'use cache'` if at all possible; per-request
  data only in an async component inside `<Suspense>` (costs a function per view).
- New animation → CSS first; motion only via `m`, and only for interactive
  effects.
- New tracked interaction → PostHog event (add it to the event table here) +
  `logger.info`.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.
