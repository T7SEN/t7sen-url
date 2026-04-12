// src/lib/logger.ts
import * as Sentry from "@sentry/nextjs";

interface LegacyLogContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

function flattenAttributes(
  context?: LegacyLogContext,
): Record<string, unknown> {
  if (!context) return {};

  const { tags, extra, ...rest } = context;
  return {
    ...tags,
    ...extra,
    ...rest,
  };
}

export const logger = {
  info: (message: string, context?: LegacyLogContext) => {
    Sentry.logger.info(message, flattenAttributes(context));
  },

  warn: (message: string, context?: LegacyLogContext) => {
    Sentry.logger.warn(message, flattenAttributes(context));
  },

  error: (err: unknown, context?: LegacyLogContext) => {
    const errorMessage = err instanceof Error ? err.message : String(err);

    Sentry.logger.error(errorMessage, flattenAttributes(context));

    Sentry.captureException(err, {
      tags: context?.tags,
      extra: context?.extra,
    });
  },

  breadcrumb: (message: string, category: string) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level: "info",
    });
  },
};
