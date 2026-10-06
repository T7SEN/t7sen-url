---
name: t7sen-url
description: >-
  Architecture, conventions, and landmines for t7sen-url — T7SEN's Next.js 16
  link-in-bio hub with a live Twitch status card, a /go/<slug> short-link
  redirect engine, a fully static page, dynamic OG images, PostHog
  analytics, and Sentry. Consult this skill for any work in this repository:
  adding or changing links, editing proxy.ts, the Twitch or OG routes,
  analytics events, animations, theming, CSP, or deployment; debugging
  build, lint, or runtime errors. Use it even for small edits — links come from src/config/links.ts,
  /api protection lives in the Vercel Firewall (outside git), proxy.ts is
  Node-only despite its "Edge" labels, and Cache Components plus LazyMotion
  strict mode fail in non-obvious ways.
---

# t7sen-url

A single-page link-in-bio site for T7SEN (streamer and developer): profile
header, live Twitch status card, a featured link, social icons, and a
support card — plus a server-side `/go/<slug>` short-link redirect engine
that tracks clicks. The page is prerendered and served from the CDN; the
proxy only handles `/go`, the Vercel Firewall guards `/api`, and several
analytics/telemetry channels run alongside. Small surface, tight coupling.

## Stack (resolved from package-lock.json)

- **Next.js 16.3.8** (exact pin) — App Router, `cacheComponents: true`,
  `reactCompiler: true`. Node **24.x** (`engines` in package.json; Vercel uses
  it over the dashboard setting).
- **React 19.3.0** (exact pin; the App Router runs Next's own bundled React
  canary, so this mostly matters for tooling), **TypeScript 6.0** (`~6.0.3`),
  strict. Path alias `@/*` → `src/*`. Not TS 7 yet: it ships no compiler API,
  so `typescript-eslint` (peer `<6.1.0`) can't lint with it.
- **Tailwind CSS 4.3** via `@tailwindcss/postcss`; configured in
  `src/app/globals.css`. No JS config file.
- **shadcn/ui**, style `base-nova`: shadcn's **Base UI** flavour, so
  `npx shadcn add <component>` installs `@base-ui/react` again (fine when a
  component needs it). The only shadcn primitive in use, `ui/button.tsx`, uses
  `radix-ui`'s `Slot`; `globals.css` imports `shadcn/tailwind.css`. Registries
  in `components.json`: Aceternity and React Bits (nothing from either is in
  use now; the Aceternity `spotlight-new.tsx` beams gave way to the CSS
  aurora).
- **motion 14** (`motion/react`) under `LazyMotion strict` + `tw-animate-css`.
- **SWR 2.5** (Twitch polling only), **next-themes 0.4.6**, **lucide-react**.
- **Sentry 11.4** (`@sentry/nextjs`), **PostHog** (`posthog-js` 1.435,
  `posthog-node` 5.55), EU region.
- **Vercel Web Analytics** (`@vercel/analytics` 2.0) and **Speed Insights**
  (`@vercel/speed-insights` 2.0), rendered in `layout.tsx`.
- **npm** (package-lock.json committed).

There is **no database, no auth, no Redis, no persistent store**. All
server state (Twitch OAuth token, live-status and schedule memos) is in-memory
per process.

## Repository structure

```
src/
├── proxy.ts                 /go/<slug> redirects + click tracking (matcher /go only)
├── instrumentation.ts       Sentry server/edge registration + onRequestError
├── instrumentation-client.ts  Sentry browser init (feedback [footer link], logs; no replay)
├── config/links.ts          siteUrl, twitchChannel, every destination + /go slug (proxy,
│                            profile, JSON-LD, metadata, robots, sitemap, OG, Share button)
├── config/profile.ts        All profile content: name, bio, links (goUrl), socials, support
├── lib/
│   ├── logger.ts            Sentry-backed logger (info/warn/error/breadcrumb)
│   ├── posthog-server.ts    posthog-node client factory
│   ├── posthog-identity.ts  Browser PostHog ID from its cookie for server-side events
│   ├── sentry-flush.ts      flushSentryAfterResponse(): Sentry.flush in after() (server-only)
│   ├── twitch.ts            Helix live status (/api/twitch, /api/og) + schedule (/api/twitch)
│   ├── use-minute-clock.ts  useMinuteClock(): the time for client components, per minute
│   └── utils.ts             cn()
├── app/
│   ├── layout.tsx           Fonts, metadata, OG URL, JSON-LD, provider tree
│   ├── page.tsx             Fully static page; footer year via 'use cache' (daily)
│   ├── page-client.tsx      The entire visible page (client component)
│   ├── api/twitch/route.ts  Live status + title/start + schedule for the card
│   ├── api/og/route.tsx     Dynamic OG image (live badge aware)
│   ├── api/health/route.ts  Liveness only ({ status: "ok" }); heap warning → Sentry
│   ├── error.tsx, global-error.tsx, not-found.tsx
│   ├── robots.ts, sitemap.ts, icon.svg, globals.css (all prerendered)
│   ├── manifest.ts          /manifest.webmanifest (prerendered)
│   └── apple-icon.png       iOS home-screen icon (generated, see Installability)
└── components/
    ├── twitch-card, primary-link-card, support-card, profile-header,
    │   copy-email-button, share-profile-button, feedback-button,
    │   magnetic-wrapper, theme-toggle, icons, json-ld
    ├── stream-status-provider  Polls /api/twitch once; useStreamStatus()
    ├── live-ambience        Live mode outside the cards (glow, tab title, favicon)
    ├── motion-provider, posthog-provider, theme-provider
    └── ui/                  button, spotlight-background (CSS aurora + cursor glow)
public/                      avatar.webp, avatar.png (OG only), twitch-banner.webp,
                             icon-192/512.png, icon-maskable-512.png (manifest),
                             icon-live.svg (favicon while live)
scripts/generate-icons.mjs   Renders icon.svg onto black tiles → the icon PNGs,
                             and icon.svg + a red dot → icon-live.svg
assets/fonts/                Space Grotesk Medium/Bold TTFs + OFL.txt (OG image only)
sentry.server.config.ts, sentry.edge.config.ts
```

## Request flow

### 0. Vercel Firewall — `/api/*` protection (dashboard, not in git)

The WAF runs before routing, the proxy and the CDN cache, and requests it
denies or rate-limits cost no CDN Request, no transfer and no function. Hobby
allows 3 custom rules (1 of them a fixed-window rate limit keyed on IP). The
live rules, in priority order:

1. **Deny scripted clients on /api** — action `deny` (403). Four OR groups,
   each `path` starts with `/api/` AND `user_agent` contains one of
   `python-requests`, `curl`, `postmanruntime`, `scrapy` (WAF matching is
   case-insensitive). An empty User-Agent is not blocked.
2. **Rate limit /api** — `path` starts with `/api/`; fixed window 60 s,
   60 requests per IP (counted per region), then the default 429. A visible
   TwitchCard tab sends 1–3 requests a minute (hidden tabs don't poll), so at
   worst about 20 tabs behind one shared IP fit. Never use `challenge` on `/api`: the card's fetch can't pass one.

The third slot is free for incidents. Change rules in the dashboard (Firewall
→ Configure → publish; takes effect in ~300 ms, no deploy) and update this
list. Keep Bot Protection off or on Log: Challenge may break link unfurlers
on `/` and `/api/og`. Requests the rate limit allows count against Hobby's
1M/month rate-limit allowance, alongside the 1M CDN Requests.

### 1. `src/proxy.ts` — runs on `/go/*` only

Next 16 renamed `middleware.ts` → `proxy.ts`, and **proxy runs on the Node.js
runtime only — Edge is not supported and not configurable.** The file's
"Edge Redirect" labels are historical (it was `middleware.ts` until commit
`e5d0117`). Matcher is `["/go/:path*"]`: the page, static files, `/api`,
`/ingest` (PostHog), `/monitoring` (Sentry tunnel) and `/_vercel` (Vercel
analytics) never run it. Proxy code runs before the CDN cache, which is why
`/api` left the matcher: every cached `/api/twitch` poll used to run it.
Hosted on Vercel with DNS-only records (no Cloudflare proxy), so the country
comes from `x-vercel-ip-country` → `"Global"`. `cf-ipcountry` is
deliberately ignored (spoofable without Cloudflare in front).

**`/go/<slug>` redirects.** `redirectMap` is built from `shortLinks` and
`slugAliases` in `src/config/links.ts`. The slug is lowercased with trailing
slashes stripped (`skipTrailingSlashRedirect` is on). Unknown slug →
`console.warn` + redirect to `/`. Known slug → **307** to the destination
for every method and agent; PostHog `short_link_clicked` (raw `fetch` to
`eu.i.posthog.com` inside `event.waitUntil`; network errors and non-2xx
answers → Sentry) fires only for `GET` requests with a user agent that is
not a bot (`userAgent().isBot`, `/\bbot\b/`, `NON_HUMAN_AGENTS`) and not a
prefetch (`Sec-Purpose`/`Purpose`), so unfurlers, HEAD probes, crawlers and
HTTP clients are not counted.

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
daily. It renders `PageClient` with a `currentYear` prop inside
`StreamStatusProvider` (a client component: its polling starts in the
browser, so the page stays static).

### 3. `src/app/page-client.tsx` — the visible page

Client component. Composes `SpotlightBackground` → `LiveAmbience` → top bar
(`ShareProfileButton` left, `ThemeToggle` right) → glass card (purple border
mask that follows the cursor via pointer events; on touch screens it lights
where a finger lands, via a `data-touch` attribute set on the DOM node so a
touch never re-renders the page) →
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
the Twitch banner: content is ~919px at full size (22px to spare at 941px
tall, where the full layout starts) and ~727px compact, so wide
windows ≥727px tall fit without a scrollbar (a 1366×768 laptop's ~650px
viewport still scrolls ~77px); phones scroll. `<body>` is `min-h-dvh`, not
`min-h-screen` (100vh is the toolbar-hidden height on mobile and forces a
phantom scroll). Entrances are CSS (`tw-animate-css`) staggered by
per-element delays, so the server HTML paints without waiting for JS; the
support card's entrance sits on its shadowed wrapper in `page-client.tsx`.

`ProfileHeader`: the avatar is 112px and the name `md:text-4xl` from `md` up
outside the `short:` band (which also starts at `md`); narrower screens keep
96px / `sm:text-3xl` and short laptops 80px / `text-2xl`, so no viewport that
fit before scrolls. On a fresh load the name "decodes": random glyphs lock in
left to right (5 × 130 ms), starting when its fade-in starts (the effect reads
the entrance animation's `currentTime` and waits out the rest of its 300 ms
delay), and hovering the name itself with a mouse replays it. The scramble is
an overlay over the real name, which stays in the DOM and turns transparent
meanwhile: `aria-hidden` (screen readers), `pointer-events-none select-none`
(selection and copy) and anchored at the text's left edge in a shrink-wrapped
`inline-block`, so locked letters don't move. The server HTML has no overlay.
It is skipped under reduced motion and when it could not start before 1.2 s
(slow hydration: the name was already readable, so scrambling it then would
look like a glitch).

## Subsystems

**Links and content.** Every outbound destination lives once in
`src/config/links.ts` (`shortLinks`: slug → URL; no React imports, since the
proxy bundles it). `src/config/profile.ts` (`profileData`) holds the rest of
the content and points links and socials at `goUrl("slug")`, typed against
`shortLinks`, so a misspelled slug fails the type-check; email uses
`shortLinks.email` (a direct `mailto:`). The proxy builds its redirects from
`shortLinks` plus `slugAliases` (retired slugs that still redirect:
`twitter` → `x`), and the JSON-LD `sameAs` lists the real destinations via
`destinationOf()`. The Twitch card links to `/go/twitch` like every other
link (`profileData.twitchUrl`), and `twitchChannel` is defined once in
`links.ts`. `siteUrl` there is the one canonical origin (`NEXT_PUBLIC_APP_URL`,
falling back to production) used by metadata, JSON-LD, robots, sitemap, the
OG domain line and the Share button. Display copy (bio, tagline, job title,
knowsAbout, share text, OG subtitle) lives in `profile.ts`.

**Twitch live status.** `StreamStatusProvider`
(`src/components/stream-status-provider.tsx`, wrapped around the page in
`page.tsx`) polls `/api/twitch?channel=…` via SWR (60 s interval, revalidate
on focus throttled to 30 s) once for the whole page; `TwitchCard`,
`ProfileHeader` and `LiveAmbience` read `{ data, isLive, isUnknown }` from
`useStreamStatus()`. Never add a second `useSWR` on that key: each hook runs
its own refresh and retry timers. The fetcher throws on
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
the cached one, then retries once; all of this is `helixGet()`), calls Helix
`/streams` with `cache: "no-store"` and a 5 s `AbortController` timeout per
call that also covers reading the body, and memoises
`{ isLive, game, title, startedAt }` (Helix "" normalised to null) per
instance for 30 s with one in-flight Helix request shared by concurrent
callers. `getSchedule(profileData.twitchUserId)` reads Helix `/schedule`
(by numeric user ID, which survives a rename; `start_time` 12 h back so a
late stream's slot still counts) with its own 15 min memo: 404 means no
schedule (a normal state, cached, not logged), canceled and ended segments
are dropped, so are segments inside a vacation (vacation mode doesn't cancel
them), up to 3 are kept, and a finished vacation is ignored. It never
rejects: on a failure it serves the last good schedule for up to an hour,
else null, and retries after 60 s. It is kept out of `getStreamStatus()` so
the OG image's budget never waits on it. Don't put
Helix back on Next's fetch data cache: its stale-while-revalidate served old
bodies and hid 401s. The route answers only the card's exact URL
`?channel=<twitchChannel>` (anything else is a 400 before any Helix or
PostHog work: the CDN keys on the full query string, so cache-busting
variants would otherwise each run the function; a partial filter, since
Next strips its internal `nxtP*`/`nxtI*` params before the handler sees the
query), waits at most 1.5 s for the schedule (then the last cached one or
null; the fetch still finishes in `after()`), and responds with
`{ isLive, game, title, startedAt, schedule }` and
`Cache-Control: public, s-maxage=60, stale-while-revalidate=30`. Timeout →
**200** `{ isLive: false }` (graceful); missing credentials
(`TwitchConfigError`) or any other failure → 500 `{ isLive: false }` + Sentry.
Each call also fires server-side PostHog `twitch_api_called` (channel,
is_live, game; not the title) when the PostHog token is set (new client per
request; `shutdown()` runs in `after()`, so the response never waits on
PostHog).

The card overlays chips on the banner, which has a fixed height, so they
never change the card's size: while live, the stream title (CSS-truncated,
shown verbatim per the Twitch Developer Agreement) and "game · uptime";
while offline, "Next stream · Tue 6:00 PM" (visitor's time zone) plus the
segment title or category, "Scheduled now" during a slot, or "On a break
until …" during a vacation. Chips are `dir="auto"` (Arabic titles truncate at
their own end) and fade in individually (a fading parent would switch off
their backdrop blur). Nothing shows without a schedule. No viewer
count (owner's choice) and no Twitch thumbnail (it would be the page's first
third-party image). Uptime and "next" come from `useMinuteClock()`
(`src/lib/use-minute-clock.ts`: a `useSyncExternalStore` clock ticking each
minute, null on the server and during hydration), because `Date.now()` in
render breaks the purity lint rule and Cache Components prerendering.

**Live mode.** While `isLive`, the page changes beyond the card, all
client-side from the shared status (no extra request, `/` stays static):
`ProfileHeader` swaps the avatar's static ring for a thicker spinning conic
ring in the logo's colours with a red "LIVE" tag, and lays a link over the
avatar (`/go/twitch`, `live_avatar_clicked`; an overlay, not a wrapping
`<a>`, so the image never remounts); `LiveAmbience` fades in a breathing
purple stage light (`-z-10` inside the content layer: above the background,
below the cards), prefixes the tab title with "🔴 LIVE · " and points the SVG
favicon at `public/icon-live.svg`, restoring both when the stream ends.
Hidden tabs don't poll, so the tab shows the status from when the page was
last visible. The ring and glow are the `animate-live-ring` /
`animate-live-breathe` utilities from `globals.css`; reduced motion stops
both. Rerun `node scripts/generate-icons.mjs` after changing `icon.svg` so
`icon-live.svg` follows it.

**OG image.** `/api/og` renders a 1200×630 `ImageResponse` with **fixed text
only** (`profileData.name`, `profileData.ogSubtitle`, the Twitch tagline or
LIVE badge) — it ignores query params, so nobody can mint branded images on
this domain; `layout.tsx` points `og:image` at plain `/api/og`. It calls
`getStreamStatus()` directly (no self-fetch through the CDN/proxy/firewall),
capped at 2.5 s so crawlers get an image without the badge rather than a
timeout; a call that loses that race is kept alive with `after()` so it
still fills the caches. Any query string gets a CDN-cacheable 308 to the
bare `/api/og` before rendering (each distinct query would otherwise be an
uncached render). Game names longer than 36 characters are truncated
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
`PostHogProvider`'s `useEffect` with `api_host: "/ingest"`, reverse-proxied
by three `next.config.ts` rewrites, as in PostHog's Next.js proxy docs:
`/ingest/static/*` (lazily loaded scripts) and `/ingest/array/*` (the
project's remote config, `config.js`) go to `eu-assets.i.posthog.com`, then
the `/ingest/*` catch-all (events, `/flags`) to `eu.i.posthog.com`. The
catch-all must stay last: the first matching rule wins. A relative `api_host`
makes posthog-js send every API and asset request there, so the CSP needs no
PostHog origin; the one exception is the PostHog toolbar, see landmine 6.
`defaults: "2026-05-30"` (the date PostHog's own docs and app use) with
`persistence_save_debounce_ms: 0` (why: next paragraph). Session replay,
heatmaps and web vitals are switched on in the PostHog project settings, not
in code, so remote config makes every view load `posthog-recorder.js`,
`dead-clicks-autocapture.js` (heatmaps load it to plot dead clicks;
`$dead_click` events stay off, `captureDeadClicks` is false) and
`web-vitals-with-attribution.js`, next to `exception-autocapture.js`
(`capture_exceptions`) and `surveys.js`, which loads even though the project
has no surveys (`disable_surveys: true` would skip its ~34 KB compressed).
Owner/preview traffic is tagged with the
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
has none (posthog-node never sent GeoIP either). The join needs the cookie
written before the click's own `/go` request leaves, hence
`persistence_save_debounce_ms: 0`: from `defaults` 2026-05-30 posthog-js
delays storage writes by 250 ms and flushes them only on unload, which a
`target=_blank` click never triggers. With the delay, a click that starts a
new session after 30 min idle reaches `/go` with the old `$sesid` (dropped
as expired, so no `$session_id`), and a first-visit click within 250 ms of
init carries no cookie at all. The cookie's name and keys are the same at
every `defaults` date up to 2026-08-30.

Event catalog:

| Event | Source |
|---|---|
| `primary_link_clicked` | `primary-link-card.tsx` |
| `social_link_clicked` | `page-client.tsx`, `copy-email-button.tsx` (with `method`: `clipboard` \| `mailto_fallback`) |
| `profile_shared` (with `method`: `native` \| `clipboard`, after the share succeeds) | `share-profile-button.tsx` |
| `support_link_clicked` | `support-card.tsx` |
| `twitch_card_clicked` (`is_live`: `true` | `false` | `null` when the status is unknown) | `twitch-card.tsx` |
| `live_avatar_clicked` (`channel`; the avatar is a link only while live) | `profile-header.tsx` |
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
Web Vitals come from Sentry tracing and PostHog `$web_vitals` (switched on in
the PostHog project settings, see Analytics). Exceeding either pauses collection, not
the site.

**Observability (Sentry).** Org `t7sen` (formerly `t7sen-c0`), project
`links`, tunnel `/monitoring`. Server/edge init via `src/instrumentation.ts`;
browser init in `src/instrumentation-client.ts`: no Session Replay (removed —
it recorded every visit in the background), the feedback integration with
`autoInject: false` (the floating button covered the support card on phones;
the footer's `FeedbackButton` opens the form via
`Sentry.getFeedback()?.attachTo()`), and console-log capture.
`withSentryConfig` is imported from `@sentry/nextjs/config` (v11). v11
removed `enableLogs` (logs flow whenever `Sentry.logger` or
`consoleLoggingIntegration` is used) and `sendDefaultPii`: the default
`dataCollection` already sends what `sendDefaultPii: true` did (IP, cookies,
headers, request bodies), which is deliberate here; set `dataCollection` in
the three `Sentry.init` calls to collect less. v11 also names environments
`production` / `preview` (v10: `vercel-production` / `vercel-preview`), sends
spans in batches instead of transaction events, and attaches stack traces to
`captureMessage`. Since Next 16.3 the proxy function awaits
`instrumentation.register()`, so `/go` requests now reach Sentry too (logs,
errors and one trace per click at `tracesSampleRate: 1`); they likely sent
nothing before. Watch the span quota; a `tracesSampler` in
`sentry.server.config.ts` can sample the proxy lower.
`src/lib/logger.ts` wraps `Sentry.logger`; `logger.error(err, ctx)` also calls
`captureException`.

**Server-side flushing.** `@sentry/nextjs` (10.48 through 11.4) only registers its flush
with Vercel's `waitUntil` on the Edge runtime (getsentry/sentry-javascript
#23087), so on Node the buffered logs, spans and errors were lost when the
function froze. Every route handler and the proxy call
`flushSentryAfterResponse()` (`src/lib/sentry-flush.ts`, server-only — don't
import it from `logger.ts`), which runs `Sentry.flush(2000)` in `after()`
after a 50 ms pause: `after()` starts on the response's `close` event, before
Next ends its root request span, and Sentry 11 streams spans (each joins a
buffer when it ends; `flush()` drains it), so the pause lets the root span
end first. `after()` callbacks run concurrently, so other `after()` work that
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
Sentry above 500 MB heap. It sits behind the Vercel Firewall rules (curl-like
User-Agents get 403) but no longer runs the proxy.

**Uptime monitoring (outside the repo).** UptimeRobot Free: two keyword
monitors every 5 min, `https://links.t7sen.com/` (keyword `T7SEN | Links`)
and `/api/health` (keyword `"status":"ok"`), alerting by email and Discord.
Its User-Agent (`UptimeRobot/2.0`) passes the firewall and counts as a bot in
the `/go` click filter. About 17k CDN Requests and 9k function invocations a
month. Don't monitor `/go/<slug>` with a GET from a checker whose User-Agent
isn't a bot (fake `short_link_clicked` events), and don't point Sentry Uptime
at `/api/*`: `robots.txt` disallows it and Sentry can disable the monitor.

**Installability.** `src/app/manifest.ts` (standalone, black
`theme_color`/`background_color`, icons `/icon-192.png`, `/icon-512.png`,
`/icon-maskable-512.png`), `src/app/apple-icon.png` (180×180, opaque) and
`icon.svg` (favicon) are all prerendered. The PNGs come from
`node scripts/generate-icons.mjs` (sharp renders `icon.svg` onto black
tiles; the maskable one keeps the logo inside the 40% safe circle), which
also writes `public/icon-live.svg` (the favicon plus a red dot, for live
mode): rerun it after changing `icon.svg`. Static PNGs over `ImageResponse` icons
(`icon.tsx`): Next 16.2 likely built those as uncached functions under Cache
Components; 16.3 can prerender them, but the committed PNGs need no render
at all and match `icon.svg` exactly.
`layout.tsx` exports `viewport.themeColor` (white / black by OS scheme) and
`metadata.appleWebApp.title`. Never set `metadata.icons` (Next then drops the
file-based icon links) or `themeColor` in `metadata` (ignored in Next 16).
`sitemap.ts` has no `lastModified`: a `new Date()` there made it a function
per fetch.

**Theming and visuals.** next-themes (`class` attribute, system default).
`ThemeToggle` (a plain button with the share button's box, hover, press and
`cursor-pointer`; Tailwind v4 buttons default to `cursor: default`) reveals
the new theme with a circular View Transition centred on the click point
(the button's centre for keyboard presses). It sets `data-theme-switch="to-dark|to-light"`
and `--theme-x/-y/-r` on `<html>`; the animation is CSS in `globals.css`. The
outgoing page is always the top, animated layer: to dark, a hole
(`mask-image` + the registered `--theme-hole` length) grows in the light
snapshot; to light, the dark snapshot's `clip-path` circle shrinks into the
button. Don't animate the incoming page over a still snapshot of the old one:
in the owner's browser the still old layer wasn't drawn and light-to-dark
flashed the `zinc-950` canvas (headless Chrome and Edge didn't reproduce it).
The update callback applies the class and `color-scheme` itself, with
transitions off and a forced layout (`applyTheme`), then calls `setTheme`:
`setTheme` alone switches the class only after React re-renders, after the
transition has captured the "new" page, and next-themes'
`disableTransitionOnChange` never forces that restyle, so revealed elements
used to fade from their old colours. Direction comes from the `<html>` class
plus a pending theme (keyboard presses reach the button mid-transition;
clicks don't, the transition overlay takes them). Reduced motion skips the
reveal but switches the same way. Visual
language: zinc palette, Twitch purple `#9146FF` accent, with the logo's
red `#ef4444` → purple → blue `#3b82f6` gradient (`icon.svg`) as the only
secondary colours (the featured card's blobs, the live ring, the aurora; no
cyan), glassmorphism (`backdrop-blur-xl`, translucent white/zinc-950), Space
Grotesk (the only font; `font-mono` falls back to Tailwind's default stack).

**Aurora.** `SpotlightBackground` (every page: home, error, not-found) lays
three large soft colour fields (purple top-left, blue top-right, red at the
bottom; alpha 0.08–0.24, stronger in dark mode) under the cursor glow. Each
drifts on its own 26/32/38 s `alternate` loop (`animate-aurora-1..3` in
`globals.css`), so the page moves on phones too. Cheap by construction: the
gradients fade to transparent (no `filter: blur`) and only `transform`
animates, so the compositor runs them without repaints
(`motion-safe:will-change-transform`: under reduced motion the drift stops
and the big layers are dropped); a static `bg-grain` noise layer (3.5% light,
5% dark, a `@utility` in `globals.css`) hides gradient banding. The cursor
glow above it is a fixed 1200px circle moved by `transform` (motion `x`/`y`),
not a gradient repainted at the cursor, which re-rastered the full-viewport
grain layer on every mouse frame; it is promoted only under `pointer-fine:`.
Text sitting directly on the background (the footer) is `text-zinc-600` in
light mode: the red field and the live glow drift under it and took
`zinc-500` below 4.5:1.

## Conventions

- **Content changes go through `profile.ts` + `links.ts`** — never hardcode
  URLs in components.
- **Time in client components:** `useMinuteClock()`, never `Date.now()` /
  `new Date()` during render.
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
- **Enforced by `npm run lint`** (project rules in `eslint.config.mjs`, `src/`
  only): the file header comment (auto-fixable, local rule), no full
  `motion` / `framer-motion` import, no `useCallback`/`useMemo`, error-first
  `logger.error`, no `bg-gradient-to-*`, no hardcoded `http(s):`/`mailto:`
  `href` (as `"…"`, `{"…"}` or a template literal; a URL built elsewhere and
  passed in a variable isn't caught), and every `target="_blank"` element with
  a literal `rel` containing both `noopener` and `noreferrer` (a selector, plus
  `react/jsx-no-target-blank` for forms and spreads). The header rule resolves
  paths from the repo root, so `npx eslint` run from a subfolder or an editor
  agrees with `npm run lint`, and its fix replaces a stale or misplaced header
  instead of adding a second one. The focus ring and tracking conventions
  below are not linted.
- **No manual `useCallback` / `useMemo`.** React Compiler is on; commit
  `8eb7666` removed them deliberately.
- **Every interactive element:** focus ring
  `focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950`.
- **Every tracked click:** `if (posthog) posthog.capture(...)` via
  `usePostHog()`, plus `logger.info(...)` with `tags.component`.
- **External links:** `target="_blank" rel="noopener noreferrer"`.
- **Touch screens never hover.** Tailwind v4's `hover:` only applies under
  `@media (hover: hover)`, and most visitors are on phones. Give every
  tappable element an `active:` press state (`active:scale-95`, or
  `active:scale-[0.98] active:duration-150` on cards so the press is quick
  and the release keeps the slower base transition). Hover-only effects need
  a touch counterpart: the glass card's border light uses pointer events and
  `data-touch`; the featured card's reveal uses the `reveal:` variant
  (`globals.css`: hover on hover-capable devices, or `data-reveal`, which
  `PrimaryLinkCard` sets once when the card scrolls into view on a touch
  screen, skipped under reduced motion). `reveal:` rules come after
  `active:` in the CSS, so the featured card's press is `active:scale-[0.98]!`.
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
NEXT_PUBLIC_APP_URL                Canonical origin, read once as `siteUrl` in
                                   src/config/links.ts: metadata, JSON-LD, robots,
                                   sitemap, the OG image's domain line, and the
                                   Share button (inlined into the client bundle
                                   at build time). Falls back to production.
TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET   Helix client-credentials flow.
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN  Browser, proxy, and server PostHog.
NEXT_PUBLIC_POSTHOG_HOST           posthog-node host (server only).
NEXT_PUBLIC_SENTRY_DSN             All three Sentry runtimes.
SENTRY_AUTH_TOKEN                  Build only: source-map upload (org auth token;
                                   secret). Without it the build still passes
                                   and skips the upload.
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
npm run lint     ESLint 10 (next core-web-vitals + typescript + project rules)
npx tsc --noEmit Type-check (no script defined)
```

There are **no tests, no type-check script, and no pre-commit hooks**. Verify
every change with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Landmines — read before editing

1. **Links come from `src/config/links.ts`.** Add the destination to
   `shortLinks` and use `goUrl("slug")` in `profile.ts`; the proxy and the
   JSON-LD pick it up. Renaming a slug breaks links already shared: keep the
   old one in `slugAliases`. Don't import React or icons into `links.ts`
   (the proxy bundles it).

2. **`proxy.ts` is Node-only.** Do not rename it back to `middleware.ts`, do
   not add `export const runtime = "edge"`, and do not trust its "Edge"
   comments. **Don't add `/api` back to its matcher**: it runs before the CDN
   cache, so every cached Twitch poll would cost a function again. The Twitch
   token and memos are **per process** and reset on every deploy/restart.

3. **API protection lives in the Vercel Firewall, not in git** (rules in
   Request flow §0). It covers every `/api/*` route, including `/api/health`
   and `/api/og`: uptime monitors using `curl` or `python-requests` get
   **403**. The OG route calls `src/lib/twitch.ts` directly, never
   `/api/twitch`. `/api/twitch` answers only for
   `profileData.twitchChannel` and only its exact query string; anything else
   is a 400.

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

8. **PostHog is initialized once, in `PostHogProvider`.** Don't add a
   root `instrumentation-client.ts` (or any second `posthog.init`): the PostHog
   wizard's commented-out copy there was deleted because enabling it
   double-initialized. `src/instrumentation-client.ts` is Sentry's browser init.
   When bumping `defaults`, keep `persistence_save_debounce_ms: 0` (it looks
   redundant but protects the `/go` session join, see Analytics) and read
   what each newer date changes in `posthog-core.js` (`defaultsThatVaryByConfig`).
   From 2026-08-29, `cookieWinsOnConflict` adds a 365-day
   `ph_<token>_posthog_cpm` cookie on `.t7sen.com`: set it to `false` unless
   another `*.t7sen.com` site shares this PostHog project.

9. **The dev-only `console.error` patch in `theme-provider.tsx` is
   intentional.** It suppresses React 19's "Encountered a script" warning
   from next-themes. Don't remove it, and don't extend it to hide other errors.

## Known tech debt — intentional vs. broken

**Removed in the cleanup (don't bring back):** `BorderGlow.tsx`,
`ui/avatar.tsx` (and `@base-ui/react`, which only it used; `shadcn add` may
bring it back legitimately, see Stack), the `.scroll-reveal` utility,
`Icons.code`, the `bg-grid-*` layer (a Tailwind v3 plugin; it rendered
nothing), `autoprefixer`, `@tailwindcss/cli`, `mini-svg-data-uri`,
`experimental.optimizeCss` + `critters` (Next 16 only runs them for Pages
Router pages), the Sentry `webpack` build options (ignored under Turbopack),
the root `instrumentation-client.ts` and `posthog-setup-report.md`, and
`ui/spotlight-new.tsx` (Aceternity's motion-driven beams, nearly invisible;
the CSS aurora replaced them). `sharp` stays: `scripts/generate-icons.mjs`
uses it.

**Cost and privacy choices to flag before changing:** `tracesSampleRate: 1`
in all three Sentry runtimes (server traces are now really delivered, see
Server-side flushing); Sentry's default `dataCollection` (kept on purpose:
Sentry gets visitor IPs, cookies and headers, now from `/go` requests too); no consent banner gates PostHog's
first-party cookie.

**Intentional — don't "fix":** Twitch timeout returns 200 offline;
`images.unoptimized`; in-memory state (the WAF does the rate limiting); `ThemeToggle` importing the
`posthog` singleton (works, though `usePostHog()` is the pattern elsewhere);
`PrimaryLinkCard` keeping `delay-500 duration-700` on its anchor, which also
delays and slows its hover transition (left as is so the featured card's
staged hover reveal keeps its timing; its press overrides them with
`active:delay-0 active:duration-150`). Because of that delay, never change
the anchor's background on `reveal:`: a light-mode `reveal:bg-[#030303]`
left the card black for ~1 s after mouse-out (the purple burst faded first,
then the background crawled back to white); the burst alone colours the
reveal, so light mode reads a lighter violet than dark mode.

**Housekeeping:** `eslint-config-next` is pinned to the exact `next`
version; bump them together. ESLint 10 needs the `settings.react.version`
workaround in `eslint.config.mjs` (eslint-plugin-react 7.37 crashes on
version auto-detection under ESLint 10; remove it once vercel/next.js#89764 is
fixed), and npm prints three `ERESOLVE overriding peer dependency` warnings
because eslint-plugin-react, -jsx-a11y and -import don't list ESLint 10 yet
(harmless; `npm ls` marks eslint "invalid"). `npm audit --omit=dev` is clean;
the full audit still lists a dev-only `braces` chain (via
`@next/eslint-plugin-next` and the shadcn CLI) with no fixed release.
`shadcn` is a devDependency: only `globals.css` imports its CSS, at build
time. Local Node below 24 prints an `EBADENGINE` warning on install.

## Before you finish a change

- New link → destination in `links.ts`, `goUrl("slug")` in `profile.ts`;
  renamed slug → old one in `slugAliases`.
- Firewall rule changed in the dashboard → Request flow §0 updated.
- New external domain → `csp` in `next.config.ts`.
- New data on the page → static or `'use cache'` if at all possible; per-request
  data only in an async component inside `<Suspense>` (costs a function per view).
- New animation → CSS first; motion only via `m`, and only for interactive
  effects. New hover effect → a touch counterpart; new tappable element → an
  `active:` press state.
- Need the live status in another component → `useStreamStatus()`, never a
  second `useSWR` on `/api/twitch`.
- New tracked interaction → PostHog event (add it to the event table here) +
  `logger.info`.
- `npx tsc --noEmit`, `npm run lint` (0 problems), and `npm run build` all
  pass.
