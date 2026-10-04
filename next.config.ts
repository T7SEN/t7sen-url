// next.config.ts
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel Toolbar / Comments on preview deployments only
// (vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy)
const isPreview = process.env.VERCEL_ENV === "preview";
// Real Vercel deployments only: `vercel dev` and `vercel env pull` also set
// VERCEL=1 locally, but with VERCEL_ENV=development
const isVercelDeployment =
  process.env.VERCEL_ENV === "production" || isPreview;

// Third-party origins: none in production. PostHog runs through the /ingest
// rewrite (api_host "/ingest" makes posthog-js send every API and asset
// request there) and Sentry through the /monitoring tunnel, both same-origin.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline': Next's inline bootstrap scripts (nonces would force the
  // static page to render per request). 'unsafe-eval' is dev-only (React
  // refresh); production React/Next never eval. Vercel Web Analytics / Speed
  // Insights load debug scripts from va.vercel-scripts.com under `next dev`
  // only; production serves them from /_vercel/* (self).
  "script-src 'self' 'unsafe-inline'" +
    (isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : "") +
    (isPreview ? " https://vercel.live" : ""),
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'" + (isPreview ? " https://vercel.live" : ""),
  // https: already covers vercel.live / vercel.com for the preview toolbar
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:" +
    (isPreview ? " https://vercel.live https://assets.vercel.com" : ""),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "connect-src 'self'" +
    (isPreview ? " https://vercel.live wss://ws-us3.pusher.com" : ""),
  ...(isPreview ? ["frame-src https://vercel.live"] : []),
  // Vercel production/preview deployments only (always HTTPS): on a local
  // http:// `next dev`/`next start` it would upgrade subresources and break
  ...(isVercelDeployment ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: csp,
  },
];

const nextConfig: NextConfig = {
  // 🚀 React Compiler is STABLE (Automatic memoization)
  reactCompiler: true,

  // 🚀 Cache Components is STABLE (The evolution of PPR)
  cacheComponents: true,

  // Assets ship pre-sized; no image optimization (no Vercel quota, no sharp at
  // request time)
  images: {
    unoptimized: true,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion/react",
      "posthog-js",
      "@sentry/nextjs",
    ],
    // No optimizeCss: Next 16 only runs it (critters) for Pages Router pages,
    // so it did nothing in this App Router site
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },

  skipTrailingSlashRedirect: true,
};

export default withSentryConfig(nextConfig, {
  org: "t7sen",
  project: "links",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  // No `webpack` options: builds use Turbopack, where Sentry ignores them
  // (debug-statement stripping and Vercel Cron monitors are webpack-only)
});
