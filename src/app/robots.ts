// src/app/robots.ts
import { MetadataRoute } from "next";
import { siteUrl } from "@/config/links";

export default function robots(): MetadataRoute.Robots {
  const appUrl = siteUrl;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og"],
      // Block crawlers from indexing internal API routes to save crawl budget
      disallow: "/api/",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
