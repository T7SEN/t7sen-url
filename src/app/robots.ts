// src/app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://t7sen.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Block crawlers from indexing internal API routes to save crawl budget
      disallow: "/api/",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
