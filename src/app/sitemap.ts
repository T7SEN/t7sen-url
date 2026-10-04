// src/app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://links.t7sen.com";

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
