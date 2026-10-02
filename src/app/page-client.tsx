// src/app/page-client.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightBackground } from "@/components/ui/spotlight-background";
import { profileData } from "@/config/profile";
import { CopyEmailButton } from "@/components/copy-email-button";
import { m as motion, useMotionValue, useMotionTemplate } from "motion/react";
import { MagneticWrapper } from "@/components/magnetic-wrapper";
import { ProfileHeader } from "@/components/profile-header";
import { PrimaryLinkCard } from "@/components/primary-link-card";
import { TwitchCard } from "@/components/twitch-card";
import { SupportCard } from "@/components/support-card"; // 🚀 Removed dynamic ssr:false import
import { usePostHog } from "posthog-js/react";
import { logger } from "@/lib/logger";
import { ShareProfileButton } from "@/components/share-profile-button";
import { FeedbackButton } from "@/components/feedback-button";
import BorderGlow from "@/components/BorderGlow";

export default function PageClient({ currentYear }: { currentYear: number }) {
  const posthog = usePostHog();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  // Page coordinates (rect + scroll on enter, pageX/pageY on move) so the
  // cached position stays valid when the document scrolls under the pointer
  const boundsRef = useRef<{ left: number; top: number } | null>(null);

  useEffect(() => {
    logger.info("User visited profile landing page", {
      tags: { page: "home" },
    });
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    boundsRef.current = {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boundsRef.current) return;
    const { left, top } = boundsRef.current;
    mouseX.set(e.pageX - left);
    mouseY.set(e.pageY - top);
  };

  const handleMouseLeave = () => {
    boundsRef.current = null;
  };

  return (
    <SpotlightBackground>
      {/* min-h-dvh (not h-dvh + overflow-hidden) so the page scrolls when the
          content is taller than the screen: phones, in-app browsers, 200% zoom */}
      <main className="relative flex min-h-dvh w-full flex-col items-center px-4 font-sans sm:px-6">
        {/* Top bar in normal DOM order (share left, theme right). Below md it
            would sit over the column, so the content gets pt-20; from md up the
            buttons sit in the corners beside the centred max-w-lg column */}
        <div className="absolute inset-x-4 top-4 z-50 flex items-center justify-between">
          <ShareProfileButton />
          <ThemeToggle />
        </div>

        {/* flex-1 centres the column and pushes the footer to the bottom of
            the screen, while both stay in normal flow (no overlap) */}
        <div className="flex w-full flex-1 flex-col items-center justify-center pt-20 md:pt-8 short:pt-4">
          <div className="z-10 flex w-full max-w-lg flex-col gap-4 short:gap-3">
            {/* Entrances are CSS (tw-animate-css) so the server HTML paints
                without waiting for JS; children stagger via their own delays */}
            <div
              onMouseEnter={handleMouseEnter}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="group/card relative flex w-full flex-col rounded-3xl border border-zinc-200/50 bg-white/40 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-8 fill-mode-backwards duration-700 dark:border-zinc-800/50 dark:bg-zinc-950/40"
            >
              {/* Named group: a bare `group` here would trigger the inner cards' group-hover styles */}
              <motion.div
                className="pointer-events-none absolute -inset-px z-50 rounded-3xl border border-[#9146FF] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                style={{
                  WebkitMaskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                  maskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                }}
              />

              <div className="flex flex-col items-center gap-6 p-6 sm:p-8 short:gap-4 short:p-5">
                <div className="w-full">
                  <ProfileHeader />
                </div>

                <div className="w-full animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-400 duration-700">
                  <TwitchCard />
                </div>

                <nav
                  className="flex w-full flex-col gap-3"
                  aria-label="Primary profile links"
                >
                  {profileData.links.map((link) => (
                    <PrimaryLinkCard key={link.id} link={link} />
                  ))}
                </nav>

                <div className="h-px w-full max-w-xs bg-zinc-200/50 animate-in fade-in fill-mode-backwards delay-500 duration-700 dark:bg-zinc-800/50" />

                <nav
                  className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-600 duration-700"
                  aria-label="Social media links"
                >
                  {profileData.socials.map((social) => {
                    const Icon = social.icon;

                    if (social.id === "email") {
                      return (
                        <MagneticWrapper key={social.id}>
                          <CopyEmailButton
                            id={social.id}
                            emailUrl={social.url}
                            title={social.title}
                          />
                        </MagneticWrapper>
                      );
                    }

                    return (
                      <MagneticWrapper key={social.id}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl border border-transparent bg-transparent text-zinc-500 transition-all hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50 dark:focus-visible:ring-offset-zinc-950 sm:h-12 sm:w-12"
                          asChild
                        >
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={social.title}
                            onClick={() => {
                              if (posthog) {
                                posthog.capture("social_link_clicked", {
                                  social_id: social.id,
                                  social_title: social.title,
                                  social_url: social.url,
                                });
                              }
                              logger.info(
                                `User clicked social link: ${social.title}`,
                                {
                                  tags: {
                                    component: "SocialButton",
                                    socialId: social.id,
                                  },
                                },
                              );
                            }}
                          >
                            <Icon
                              className="h-4 w-4 sm:h-5 sm:w-5"
                              aria-hidden="true"
                            />
                            <span className="sr-only">{social.title}</span>
                          </a>
                        </Button>
                      </MagneticWrapper>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* The entrance sits on the element that owns the shadow, so no empty
                shadow box shows while the card waits for its delay */}
            {profileData.support && (
              <div className="w-full shrink-0 rounded-2xl shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-700 duration-700">
                <SupportCard
                  title={profileData.support.title}
                  subtitle={profileData.support.subtitle}
                  url={profileData.support.url}
                />
              </div>
            )}
          </div>
        </div>

        {/* In normal flow at the bottom; it used to be absolute and overlap the support card */}
        <footer className="flex items-center gap-1 py-4 text-xs font-medium text-zinc-500 animate-in fade-in fill-mode-backwards delay-1000 duration-700 short:py-3 dark:text-zinc-400">
          <span>© {currentYear}</span>
          <span>•</span>
          <span>
            Made with{" "}
            <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              💜{" "}
            </span>
            by T7SEN
          </span>
          <span aria-hidden="true">•</span>
          <FeedbackButton />
        </footer>
      </main>
    </SpotlightBackground>
  );
}
