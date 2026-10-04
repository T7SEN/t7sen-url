# t7sen-url

T7SEN's link-in-bio hub at [links.t7sen.com](https://links.t7sen.com): one
fully static page (profile, live Twitch card with stream details and the next
scheduled stream, links, support card) and a `/go/<slug>` short-link redirect
engine that counts clicks.

Built with Next.js 16 (App Router, Cache Components, React Compiler), React 19,
Tailwind CSS 4, motion, SWR, PostHog, Sentry and Vercel Web Analytics. Hosted
on Vercel (Hobby) with the Vercel Firewall guarding `/api`.

## Develop

```bash
npm install
npm run dev
```

Before calling a change done:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

There are no tests; the build is the correctness gate. `npm run lint` also
enforces the project conventions (file header comments, `m as motion`, no
`useCallback`/`useMemo`, error-first `logger.error`, no hardcoded URL `href`s,
`rel="noopener noreferrer"` on new-tab links).

## Configuration

Copy the variables into `.env.local` (never commit it):

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical origin (metadata, JSON-LD, robots, sitemap, OG image, Share button) |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Twitch Helix live status and schedule |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Error and performance monitoring |
| `SENTRY_AUTH_TOKEN` | Build only: Sentry source-map upload (org auth token, secret) |

Profile text lives in `src/config/profile.ts`; every URL and `/go` slug lives
in `src/config/links.ts`. Icons for the web manifest are generated from
`src/app/icon.svg` with `node scripts/generate-icons.mjs`.

## More

- [`AGENTS.md`](AGENTS.md): the rules for working in this repo.
- [`SKILL.md`](SKILL.md): architecture, subsystems, firewall rules and
  landmines.
