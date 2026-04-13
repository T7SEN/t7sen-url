// src/app/page.tsx
import { headers } from "next/headers";
import PageClient from "./page-client";

export default async function Home() {
  // 🚀 Await the headers API to read the Edge A/B injection
  const headersList = await headers();
  const supportVariant = headersList.get("x-ab-variant") || "control";

  // Pass the variant cleanly to your client-side animations
  return <PageClient supportVariant={supportVariant} />;
}
