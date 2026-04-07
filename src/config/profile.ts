// src/config/profile.ts
import { Icons } from "@/components/icons";
import * as React from "react";

export interface ProfileLink {
  id: string;
  title: string;
  url: string;
  icon: React.ElementType;
  isFeatured?: boolean;
}

export interface ProfileConfig {
  name: string;
  twitchChannel: string;
  twitchTagline: string;
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
  twitchTagline: "Building software. Destroying lobbies.",
  bio: "Software Architect by day. Streamer & Gamer by night.",
  avatarUrl: "/avatar.webp",
  bannerUrl: "/twitch-banner.webp",

  support: {
    id: "creators_sa",
    title: "Support the Stream",
    subtitle: "Drop a tip on Creators.sa",
    url: "https://creators.sa/t7sen",
  },

  links: [
    {
      id: "website",
      title: "My Site",
      url: "https://t7sen.com",
      icon: Icons.globe,
      isFeatured: true,
    },
  ],

  socials: [
    {
      id: "discord",
      title: "Discord",
      url: "https://discord.gg/your-invite-link",
      icon: Icons.discord,
    },
    {
      id: "instagram",
      title: "Instagram",
      url: "https://instagram.com/t7sen",
      icon: Icons.instagram,
    },
    {
      id: "github",
      title: "GitHub",
      url: "https://github.com/t7sen",
      icon: Icons.github,
    },
    {
      id: "email",
      title: "Email",
      url: "mailto:hello@t7sen.com",
      icon: Icons.mail,
    },
  ],
};
