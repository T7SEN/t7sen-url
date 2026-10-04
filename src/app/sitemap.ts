// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { siteUrl } from "@/config/links";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = siteUrl;

  // No lastModified: new Date() here made /sitemap.xml a function call on
  // every fetch (Cache Components can't prerender a Date read); without it the
  // sitemap is prerendered at build like robots.txt
  return [
    {
      url: appUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
