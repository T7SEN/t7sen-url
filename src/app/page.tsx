// src/app/page.tsx
"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightBackground } from "@/components/ui/spotlight-background";
import { TwitchCard } from "@/components/twitch-card";
import { profileData } from "@/config/profile";
import posthog from "posthog-js";
import { CopyEmailButton } from "@/components/copy-email-button";
import { SupportCard } from "@/components/support-card";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import { MagneticWrapper } from "@/components/magnetic-wrapper";

export default function Home() {
  const userInitials = profileData.name.slice(0, 2).toUpperCase();
  const currentYear = new Date().getFullYear();

  // 🎯 Mouse Tracking Logic for the Border Mask
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <SpotlightBackground>
      <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 font-sans sm:px-6">
        {/* Pinned to top right */}
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
            onMouseMove={handleMouseMove}
            className="group relative flex w-full max-w-lg max-h-[85dvh] flex-col rounded-3xl border border-zinc-200/50 bg-white/40 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/40"
          >
            {/* ✨ The Reactive Border Mask ✨ */}
            <motion.div
              className="pointer-events-none absolute -inset-px z-50 rounded-3xl border border-[#9146FF] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                WebkitMaskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
                maskImage: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`,
              }}
            />

            {/* Inner Scrollable Content */}
            <div className="flex flex-col items-center gap-6 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <header className="flex flex-col items-center gap-4 text-center">
                <Avatar className="h-24 w-24 border-4 border-white shadow-xl animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-150 duration-700 dark:border-zinc-900">
                  <AvatarImage
                    src={profileData.avatarUrl}
                    alt={`${profileData.name} avatar`}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-zinc-200 text-xl font-bold dark:bg-zinc-800">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-300 duration-700">
                  <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                    {profileData.name}
                  </h1>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:text-base">
                    {profileData.bio}
                  </p>
                </div>
              </header>

              <div className="w-full animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-500 duration-700">
                <TwitchCard />
              </div>

              <nav
                className="flex w-full flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards delay-700 duration-700"
                aria-label="Primary profile links"
              >
                {profileData.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.id}
                      variant="outline"
                      size="lg"
                      className={`group/btn relative h-14 w-full overflow-hidden rounded-2xl border-zinc-200/80 bg-white/60 text-sm font-semibold transition-all hover:scale-[1.02] hover:bg-white hover:shadow-md active:scale-[0.98] dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 sm:text-base ${
                        link.isFeatured
                          ? "shadow-[#9146FF]/5 border-[#9146FF]/30 dark:border-[#9146FF]/30"
                          : ""
                      }`}
                      asChild
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          posthog.capture("link_clicked", {
                            link_id: link.id,
                            link_title: link.title,
                            link_url: link.url,
                          })
                        }
                      >
                        {link.isFeatured && (
                          <div className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-r from-[#9146FF]/10 via-transparent to-[#9146FF]/10 opacity-50 dark:from-[#9146FF]/20 dark:to-[#9146FF]/20" />
                        )}

                        <div
                          className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${link.isFeatured ? "text-[#9146FF] dark:text-[#9146FF]" : "text-zinc-400 group-hover/btn:text-zinc-900 dark:group-hover/btn:text-zinc-50"}`}
                        >
                          <Icon
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="w-full text-center">{link.title}</span>
                      </a>
                    </Button>
                  );
                })}
              </nav>

              <div className="h-px w-full max-w-xs bg-zinc-200/50 animate-in fade-in fill-mode-backwards delay-[900ms] duration-700 dark:bg-zinc-800/50" />

              {/* 🧲 Secondary Social Row (Now Magnetic!) 🧲 */}
              <nav
                className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-[900ms] duration-700"
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
                        className="h-10 w-10 rounded-xl border border-transparent bg-transparent text-zinc-500 transition-all hover:scale-110 hover:border-zinc-200/50 hover:bg-white/60 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50 sm:h-12 sm:w-12"
                        asChild
                      >
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={social.title}
                          onClick={() =>
                            posthog.capture("social_link_clicked", {
                              social_id: social.id,
                              social_title: social.title,
                              social_url: social.url,
                            })
                          }
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
          </motion.div>

          <div className="w-full shrink-0 rounded-2xl shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards delay-[1000ms] duration-700">
            <SupportCard />
          </div>
        </div>

        <footer className="absolute bottom-4 z-10 flex items-center gap-1 text-xs font-medium text-zinc-500 animate-in fade-in fill-mode-backwards delay-1000 duration-700 dark:text-zinc-500">
          <span>© {currentYear}</span>
          <span>•</span>
          <span>Made by T7SEN with</span>
          <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            ❤️
          </span>
        </footer>
      </main>
    </SpotlightBackground>
  );
}
