// next.config.ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Vercel Web Analytics / Speed Insights load their debug scripts from this
// origin under `next dev` only; production serves them from /_vercel/* (self).
const vercelDevScripts =
  process.env.NODE_ENV === "development" ? " https://va.vercel-scripts.com" : "";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' " +
    "https://eu.i.posthog.com https://eu-assets.i.posthog.com" +
    vercelDevScripts,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "connect-src 'self' https://eu.i.posthog.com " +
    "https://eu-assets.i.posthog.com",
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

  // 🚀 DigitalOcean optimization: Disable built-in image resizing
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
    optimizeCss: true,
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
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
