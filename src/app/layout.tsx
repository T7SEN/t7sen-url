// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { profileData } from "@/config/profile";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚀 Pre-encode the parameters so the URL doesn't break
const ogTitle = encodeURIComponent(profileData.name);
const ogSubtitle = encodeURIComponent("Portfolio & Links");
const ogImageUrl = `/api/og?title=${ogTitle}&subtitle=${ogSubtitle}`;

export const metadata: Metadata = {
  title: `${profileData.name} | Links`,
  description: profileData.bio,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: profileData.name,
    // 🚀 Injecting the Dynamic Edge Image for Discord/Facebook
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${profileData.name} Profile Preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${profileData.name} | Links`,
    description: profileData.bio,
    // 🚀 Injecting the Dynamic Edge Image for X/Twitter
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profileData.name,
      alternateName: profileData.twitchChannel,
      description: profileData.bio,
      image: `${appUrl}${profileData.avatarUrl}`,
      sameAs: [
        `https://twitch.tv/${profileData.twitchChannel}`,
        ...profileData.socials.map((social) => social.url),
        ...profileData.links.map((link) => link.url),
      ].filter((url) => !url.startsWith("mailto:")),
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} min-h-screen antialiased bg-zinc-50 dark:bg-zinc-950 font-sans`}
      >
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MotionProvider>{children}</MotionProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
