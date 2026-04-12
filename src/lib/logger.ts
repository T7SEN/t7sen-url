// src/lib/logger.ts
import * as Sentry from "@sentry/nextjs";

export interface LogContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    Sentry.captureMessage(message, {
      level: "info",
      ...context,
    });
  },

  warn: (message: string, context?: LogContext) => {
    Sentry.captureMessage(message, {
      level: "warning",
      ...context,
    });
  },

  error: (err: unknown, context?: LogContext) => {
    Sentry.captureException(err, context);
  },

  breadcrumb: (message: string, category: string) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level: "info",
    });
  },
};
