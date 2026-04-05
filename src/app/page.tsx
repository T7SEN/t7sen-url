import Image from "next/image";

const profileData = {
  name: "@t7sen",
  bio: "Software Architect & Full-Stack Developer",
  avatarUrl: "/vercel.svg",
  links: [
    {
      id: "1",
      title: "GitHub Portfolio",
      url: "https://github.com/t7sen/portfolio",
    },
    {
      id: "2",
      title: "DigitalOcean Deployment Guide",
      url: "https://digitalocean.com",
    },
    {
      id: "3",
      title: "Read my latest article",
      url: "#",
    },
  ],
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 py-16 px-4 font-sans dark:bg-black">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10">
        {/* Profile Header Section */}
        <header className="flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-zinc-200 ring-4 ring-white shadow-sm dark:bg-zinc-800 dark:ring-zinc-900">
            <Image
              src={profileData.avatarUrl}
              alt={`${profileData.name} avatar`}
              width={64}
              height={64}
              className="object-contain dark:invert"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {profileData.name}
            </h1>
            <p className="mt-2 text-base font-medium text-zinc-600 dark:text-zinc-400">
              {profileData.bio}
            </p>
          </div>
        </header>

        {/* Links Container */}
        <nav className="flex w-full flex-col gap-4">
          {profileData.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-16 w-full items-center justify-center rounded-2xl bg-white px-6 py-4 text-center text-base font-semibold text-zinc-900 shadow-sm transition-all hover:scale-[1.02] hover:bg-zinc-100 hover:shadow-md dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {link.title}
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}
