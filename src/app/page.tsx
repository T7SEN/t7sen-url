// src/app/page.tsx
"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightBackground } from "@/components/ui/spotlight-background";
import { profileData } from "@/config/profile";
import { CopyEmailButton } from "@/components/copy-email-button";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  type Variants,
} from "motion/react";
import { MagneticWrapper } from "@/components/magnetic-wrapper";
import { ProfileHeader } from "@/components/profile-header";
import { PrimaryLinkCard } from "@/components/primary-link-card";
import { TwitchCard } from "@/components/twitch-card";
import { usePostHog } from "posthog-js/react";
import { logger } from "@/lib/logger";

const SupportCard = dynamic(
  () => import("@/components/support-card").then((mod) => mod.SupportCard),
  {
    ssr: false,
  },
);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.5,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function Home() {
  const currentYear = new Date().getFullYear();
  const posthog = usePostHog();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const boundsRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    logger.info("User visited profile landing page", {
      tags: { page: "home" },
    });
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    boundsRef.current = e.currentTarget.getBoundingClientRect();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boundsRef.current) return;
    const { left, top } = boundsRef.current;
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const handleMouseLeave = () => {
    boundsRef.current = null;
  };

  return (
    <SpotlightBackground>
      <main className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 font-sans sm:px-6">
        <div className="absolute right-4 top-4 z-50">
          <ThemeToggle />
        </div>

        <div className="z-10 flex w-full max-w-lg flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 18,
              mass: 1.2,
              delay: 0.3,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative flex w-full max-w-lg max-h-[85dvh] flex-col rounded-3xl border border-zinc-200/50 bg-white/40 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/40"
          >
            <motion.div
              className="pointer-events-none absolute -inset-px z-50 rounded-3xl border border-[#9146FF] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                WebkitMaskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                maskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
              }}
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center gap-6 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <motion.div variants={itemVariants} className="w-full">
                <ProfileHeader />
              </motion.div>

              <motion.div variants={itemVariants} className="w-full">
                <TwitchCard />
              </motion.div>

              <motion.nav
                variants={itemVariants}
                className="flex w-full flex-col gap-3"
                aria-label="Primary profile links"
              >
                {profileData.links.map((link) => (
                  <PrimaryLinkCard key={link.id} link={link} />
                ))}
              </motion.nav>

              <motion.div
                variants={itemVariants}
                className="h-px w-full max-w-xs bg-zinc-200/50 dark:bg-zinc-800/50"
              />

              <motion.nav
                variants={itemVariants}
                className="flex flex-wrap items-center justify-center gap-3"
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
              </motion.nav>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="w-full shrink-0 rounded-2xl shadow-xl backdrop-blur-xl"
          >
            <SupportCard />
          </motion.div>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute bottom-4 z-10 flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-500"
        >
          <span>© {currentYear}</span>
          <span>•</span>
          <span>Made by T7SEN with</span>
          <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            💜
          </span>
        </motion.footer>
      </main>
    </SpotlightBackground>
  );
}
