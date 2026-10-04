// src/config/links.ts
// Every outbound destination, once. src/proxy.ts builds its /go redirects
// from shortLinks, profile.ts points the UI at goUrl(slug) (a misspelled slug
// fails the type-check instead of silently redirecting to "/"), and the
// JSON-LD lists the real destinations via destinationOf(). No React or icon
// imports here: the proxy bundles this file.

/** Short-link slugs and where /go/<slug> sends visitors (307). */
export const shortLinks = {
  website: "https://t7sen.com",
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

/** Public Twitch channel page (the card's link and the JSON-LD profile). */
export function twitchChannelUrl(channel: string): string {
  return `https://twitch.tv/${channel}`;
}
