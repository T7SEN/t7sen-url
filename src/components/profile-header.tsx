// src/components/profile-header.tsx
import Image from "next/image";
import { profileData } from "@/config/profile";

export function ProfileHeader() {
  const userInitials = profileData.name.slice(0, 2).toUpperCase();

  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full p-0.5 bg-linear-to-b from-[#9146FF] to-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-150 duration-700 dark:to-zinc-950">
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white dark:border-[#030303] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <span className="absolute text-xl font-bold text-zinc-500 dark:text-zinc-400">
            {userInitials}
          </span>
          {/* 🚀 Next.js Image with 'priority' forces instant LCP loading */}
          <Image
            src={profileData.avatarUrl}
            alt={`${profileData.name} avatar`}
            fill
            priority
            sizes="96px"
            className="object-cover relative z-10"
          />
        </div>
      </div>

      <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards delay-300 duration-700">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {profileData.name}
        </h1>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:text-base">
          {profileData.bio}
        </p>
      </div>
    </header>
  );
}
