// src/app/page.tsx
import { headers } from "next/headers";
import { Suspense } from "react";
import PageClient from "./page-client";

// 🚀 1. The Dynamic Loader (Streams in at runtime)
async function DynamicVariantLoader() {
  // Awaiting headers opts this specific boundary into dynamic runtime rendering
  const headersList = await headers();
  const supportVariant = headersList.get("x-ab-variant") || "control";

  // Because we accessed Request data above, reading the Date here is now perfectly legal
  const currentYear = new Date().getFullYear();

  return (
    <PageClient supportVariant={supportVariant} currentYear={currentYear} />
  );
}

// 🚀 2. The Static Shell (Renders instantly at build time)
export default function Home() {
  return (
    // 🚀 3. The Suspense Boundary
    // The shell is now completely pure, static, and instantly cacheable at the Edge
    <Suspense fallback={null}>
      <DynamicVariantLoader />
    </Suspense>
  );
}
