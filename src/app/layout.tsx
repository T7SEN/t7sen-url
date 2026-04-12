// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  },
  twitter: {
    card: "summary_large_image",
    title: `${profileData.name} | Links`,
    description: profileData.bio,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ✨ Architecting the JSON-LD Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profileData.name,
      alternateName: profileData.twitchChannel,
      description: profileData.bio,
      image: `${appUrl}${profileData.avatarUrl}`,
      // Automatically aggregate all your social networks into the schema
      sameAs: [
        `https://twitch.tv/${profileData.twitchChannel}`,
        ...profileData.socials.map((social) => social.url),
        ...profileData.links.map((link) => link.url),
      ].filter((url) => !url.startsWith("mailto:")), // Exclude emails from search indexing
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Injecting the structured data invisibly into the DOM */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} min-h-screen antialiased bg-zinc-50 dark:bg-zinc-950 font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
