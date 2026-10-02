<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# t7sen-url — Agent Guide

T7SEN's link-in-bio hub: a single page (profile, live Twitch card, links,
A/B-tested support card) plus a `/go/<slug>` short-link redirect engine.
For architecture, subsystems, and the full landmines list, read `SKILL.md`
in the repo root.

## Stack

Next.js 16.2 (App Router, `cacheComponents`, `reactCompiler`) · React 19.2 ·
TypeScript 5 strict · Tailwind CSS v4 (CSS-configured, no JS config) ·
shadcn/ui (`base-nova`) · motion (`LazyMotion strict`) · SWR · next-themes ·
Sentry · PostHog (EU). Package manager: **npm**. Path alias `@/*` → `src/*`.
No database, no auth — all server state is in-memory.

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

- `src/proxy.ts` — `/api/*` firewall + rate limit, `/go/<slug>` redirects, A/B
  cookie and geo headers.
- `src/config/profile.ts` — all profile content and links.
- `src/app/page.tsx` — static shell + `<Suspense>`; `page-client.tsx` — the
  visible page.
- `src/app/api/` — `twitch` (live status), `og` (OG image), `health`.
- `src/components/` — feature components; `ui/` for primitives.
- `src/lib/logger.ts` — Sentry-backed logger.

## Critical rules

- **Links live in two places.** Add or rename a link in `profile.ts`
  (`/go/<slug>`) **and** in `redirectMap` in `proxy.ts`, in the same change.
  A missing slug silently redirects to `/`.
- **`proxy.ts` runs on Node.js only** (Next 16). Do not rename it to
  `middleware.ts` or add an edge runtime export. Its rate limiter is
  per-process and in-memory.
- **Keep the `page.tsx` shell static.** Request data, `Date`, and randomness
  belong inside an async component under `<Suspense>`.
- **Import motion as `m`:** `import { m as motion } from "motion/react"`.
  The full `motion` component throws under `LazyMotion strict`. Prefer
  `tw-animate-css` classes for entrance animations.
- **No manual `useCallback` / `useMemo`** — React Compiler handles memoization.
- **New external script/fetch domain → update `csp` in `next.config.ts`.**
- **Keep `public/avatar.png`** — the OG route cannot read WebP.
- Do not uncomment the root `instrumentation-client.ts`; PostHog is already
  initialized in `PostHogProvider`.
- Never commit secrets. Env vars: `NEXT_PUBLIC_APP_URL`, `TWITCH_CLIENT_ID`,
  `TWITCH_CLIENT_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`,
  `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`.

## Conventions

Every interactive element gets the `#9146FF` focus-visible ring. Every
tracked click fires a PostHog event (`usePostHog()`, guarded) plus
`logger.info` with `tags.component`. External links use
`target="_blank" rel="noopener noreferrer"`. `src/` files start with a
`// src/path` header comment. Tailwind v4 class names (`bg-linear-to-r`).
