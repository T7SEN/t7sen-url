// src/components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;

  // 🚀 Replaced 'any[]' with 'unknown[]' for strict type safety
  console.error = (...args: unknown[]) => {
    const firstArg = args[0];

    // 🚀 Safely narrow the type to string before using .includes()
    const isScriptWarning =
      typeof firstArg === "string" && firstArg.includes("Encountered a script");

    if (isScriptWarning) {
      return;
    }

    originalError(...args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
