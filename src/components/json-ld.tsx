// src/components/json-ld.tsx
import { profileData } from "@/config/profile";
import { destinationOf, twitchChannelUrl } from "@/config/links";

export function JsonLd() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://links.t7sen.com";

  // 🚀 The Maximum-Strength SEO Graph
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        // 1. Establish the Website itself
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        url: appUrl,
        name: `${profileData.name} | Links`,
        description: profileData.bio,
        publisher: {
          "@id": `${appUrl}/#person`,
        },
      },
      {
        // 2. Establish the specific Page type
        "@type": "ProfilePage",
        "@id": `${appUrl}/#profile`,
        url: appUrl,
        inLanguage: "en-US",
        isPartOf: {
          "@id": `${appUrl}/#website`,
        },
        about: {
          "@id": `${appUrl}/#person`,
        },
      },
      {
        // 3. Establish YOU as a recognized Entity
        "@type": "Person",
        "@id": `${appUrl}/#person`,
        name: profileData.name,
        alternateName: profileData.twitchChannel,
        description: profileData.bio,
        image: `${appUrl}${profileData.avatarUrl}`,
        url: appUrl,
        // 🚀 High-value SEO keywords
        jobTitle: "Software Architect & Content Creator",
        knowsAbout: [
          "Software Engineering",
          "Gaming",
          "Web Development",
          "Content Creation",
        ],
        // Every profile the links point at. Real destinations, not the /go
        // short links: sameAs needs absolute URLs of the profiles themselves
        sameAs: [
          twitchChannelUrl(profileData.twitchChannel),
          ...profileData.socials.map((social) => destinationOf(social.url)),
          ...profileData.links.map((link) => destinationOf(link.url)),
        ].filter((url) => !url.startsWith("mailto:")),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
