// src/components/profile-header.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileData } from "@/config/profile";

export function ProfileHeader() {
  const userInitials = profileData.name.slice(0, 2).toUpperCase();

  return (
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
  );
}
