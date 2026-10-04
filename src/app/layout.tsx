// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { profileData } from "@/config/profile";
import { JsonLd } from "@/components/json-ld";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// The OG route renders fixed text from profile.ts (name + ogSubtitle) and
// ignores query params, so the image URL carries none
const ogImageUrl = "/api/og";

export const metadata: Metadata = {
  title: `${profileData.name} | Links`,
  description: profileData.bio,
  // Same production fallback as robots, sitemap and JSON-LD, so a build without
  // the env var never emits a localhost canonical or og:url
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://links.t7sen.com",
  ),
  // Collapses the *.vercel.app alias and ?utm/?ref variants onto one URL
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: profileData.name,
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
    images: [ogImageUrl],
  },
  // Home-screen label on iOS. Icons come from the file conventions
  // (icon.svg, apple-icon.png): setting metadata.icons would drop them.
  appleWebApp: { title: profileData.name },
};

// Browser UI colour (Chrome on Android, installed app windows): the top of the
// page is white in light mode and black in dark (SpotlightBackground). Follows
// the OS scheme, not the in-page theme toggle. Must not go in `metadata`.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd />
      </head>
      {/* Browser extensions inject attributes on <body> before hydration (e.g.
          inmaintabuse, cz-shortcut-listen). The app never sets body attributes,
          and this only covers <body> itself, not its children. */}
      <body
        className={`${spaceGrotesk.variable} min-h-dvh antialiased bg-zinc-50 dark:bg-zinc-950 font-sans`}
        suppressHydrationWarning
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
        {/* Client-only; each wraps itself in <Suspense>, so the shell stays static */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
