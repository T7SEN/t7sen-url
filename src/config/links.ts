// src/config/links.ts
// Every URL the site uses, once: its own origin (siteUrl) and every outbound
// destination. src/proxy.ts builds its /go redirects from shortLinks,
// profile.ts points the UI at goUrl(slug) (a misspelled slug fails the
// type-check instead of silently redirecting to "/"), and the JSON-LD lists
// the real destinations via destinationOf(). No React or icon imports here:
// the proxy bundles this file.

/**
 * Canonical origin for metadata, JSON-LD, robots, sitemap, the OG image's
 * domain line and the Share button. NEXT_PUBLIC_APP_URL is inlined at build
 * time; the fallback is production, so a build without it never emits a
 * localhost or preview URL.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://links.t7sen.com";

/** Twitch login; profileData.twitchChannel and the Helix calls use it. */
export const twitchChannel = "it7sen";

/** Short-link slugs and where /go/<slug> sends visitors (307). */
export const shortLinks = {
  website: "https://t7sen.com",
  twitch: `https://twitch.tv/${twitchChannel}`,
  discord: "https://discord.com/users/170916597156937728",
  instagram: "https://instagram.com/t7me.1",
  github: "https://github.com/t7sen",
  x: "https://x.com/T7ME_",
  support: "https://creators.sa/t7sen",
  email: "mailto:hello@t7sen.com",
} as const;

export type ShortLinkSlug = keyof typeof shortLinks;

/** Retired slugs that still redirect, for links already shared. */
export const slugAliases: Record<string, ShortLinkSlug> = {
  twitter: "x",
};

/** The /go URL for a slug. */
export function goUrl(slug: ShortLinkSlug): string {
  return `/go/${slug}`;
}

/** The real destination behind a /go/<slug> URL; any other URL unchanged. */
export function destinationOf(url: string): string {
  if (!url.startsWith("/go/")) return url;
  const slug = url.slice("/go/".length);
  return Object.hasOwn(shortLinks, slug)
    ? shortLinks[slug as ShortLinkSlug]
    : url;
}
