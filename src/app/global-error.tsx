// src/app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
}

export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: "global-error",
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <Error statusCode={500} />
      </body>
    </html>
  );
}
