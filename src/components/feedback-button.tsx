// src/components/feedback-button.tsx
"use client";

import * as React from "react";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";
import { logger } from "@/lib/logger";

// Opens Sentry's feedback form (feedbackIntegration runs with autoInject:false,
// so this footer link is the only way in)
export function FeedbackButton() {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  // Whether a click actually opens the form, so an inert button isn't counted
  const attachedRef = React.useRef(false);
  const posthog = usePostHog();

  React.useEffect(() => {
    const feedback = Sentry.getFeedback();
    const button = buttonRef.current;
    // No Sentry client (e.g. missing DSN): the button stays inert
    if (!feedback || !button) return;

    // attachTo opens the form on click; its return value detaches it. The
    // form moves focus into itself and never restores it, so send keyboard
    // users back to the link when it closes or is submitted (WCAG 2.4.3)
    const detach = feedback.attachTo(button, {
      onFormClose: () => button.focus(),
      onFormSubmitted: () => button.focus(),
    });
    attachedRef.current = true;

    return () => {
      attachedRef.current = false;
      detach();
    };
  }, []);

  const handleClick = () => {
    if (!attachedRef.current) return;

    if (posthog) {
      posthog.capture("feedback_opened");
    }

    logger.info("User opened the feedback form", {
      tags: { component: "FeedbackButton" },
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      // min-h-6 keeps a 24px target (WCAG 2.5.8) for 12px text
      className="inline-flex min-h-6 cursor-pointer items-center rounded-sm px-1 underline-offset-2 transition-colors hover:text-zinc-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9146FF] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:hover:text-zinc-200 dark:focus-visible:ring-offset-zinc-950"
    >
      Feedback
    </button>
  );
}
