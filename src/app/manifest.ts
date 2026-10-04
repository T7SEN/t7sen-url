// src/app/manifest.ts
// Served as /manifest.webmanifest and prerendered at build (no request data,
// no Date or I/O here, or it becomes a function per fetch). Next adds the
// <link rel="manifest"> itself. The icon PNGs come from
// scripts/generate-icons.mjs; apple-icon.png in this folder covers iOS.
import type { MetadataRoute } from "next";
import { profileData } from "@/config/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${profileData.name} | Links`,
    short_name: profileData.name,
    description: profileData.bio,
    start_url: "/",
    scope: "/",
    display: "standalone",
    // One value for both schemes: black matches the dark page and the icon
    // tile, so the Android splash screen is seamless
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
