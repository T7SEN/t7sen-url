// src/app/page.tsx
import { cacheLife } from "next/cache";
import PageClient from "./page-client";

// The page reads no request data, so it is prerendered and served from the
// CDN. Under Cache Components a Date read needs 'use cache': the year is
// cached and the page revalidates daily, so it rolls over within a day of New Year.
async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function Home() {
  const currentYear = await getCurrentYear();

  return <PageClient currentYear={currentYear} />;
}
