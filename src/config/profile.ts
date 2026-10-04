// src/config/profile.ts
import { Icons } from "@/components/icons";
import * as React from "react";
import { goUrl, shortLinks } from "@/config/links";

export interface ProfileLink {
  id: string;
  title: string;
  /** goUrl(slug) for tracked short links; destinations live in links.ts */
  url: string;
  icon: React.ElementType;
  isFeatured?: boolean;
}

export interface ProfileConfig {
  name: string;
  twitchChannel: string;
  /** Numeric Twitch user ID (never changes on rename); Helix /schedule needs it */
  twitchUserId: string;
  twitchTagline: string;
  /** Subtitle on the /api/og share image (the route takes no text from the URL) */
  ogSubtitle: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  links: ProfileLink[];
  socials: ProfileLink[];
  support?: {
    id: string;
    title: string;
    subtitle: string;
    url: string;
  };
}

export const profileData: ProfileConfig = {
  name: "T7SEN",
  twitchChannel: "it7sen",
  twitchUserId: "518195741",
  twitchTagline: "Building software. Destroying lobbies.",
  ogSubtitle: "Portfolio & Links",
  bio: "Software Architect by day. Streamer & Gamer by night.",
  avatarUrl: "/avatar.webp",
  bannerUrl: "/twitch-banner.webp",

  support: {
    id: "creators_sa",
    title: "Support the Stream",
    subtitle: "Drop a tip on Creators.sa",
    url: goUrl("support"),
  },

  links: [
    {
      id: "website",
      title: "My Site",
      url: goUrl("website"),
      icon: Icons.globe,
      isFeatured: true,
    },
  ],

  socials: [
    {
      id: "discord",
      title: "Discord",
      url: goUrl("discord"),
      icon: Icons.discord,
    },
    {
      id: "instagram",
      title: "Instagram",
      url: goUrl("instagram"),
      icon: Icons.instagram,
    },
    {
      id: "github",
      title: "GitHub",
      url: goUrl("github"),
      icon: Icons.github,
    },
    {
      id: "twitter",
      title: "Twitter / X",
      url: goUrl("x"),
      icon: Icons.twitter,
    },
    {
      id: "email",
      title: "Email",
      url: shortLinks.email,
      icon: Icons.mail,
    },
  ],
};
