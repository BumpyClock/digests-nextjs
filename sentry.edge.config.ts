// This file configures the initialization of Sentry for edge functions.
// The config you add here will be used whenever a edge function is executed.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",

  // Filter edge function errors
  beforeSend(event) {
    // Add edge-specific context
    if (event.contexts) {
      event.contexts.runtime = {
        name: 'edge',
        version: process.env.EDGE_RUNTIME_VERSION,
      };
    }
    return event;
  },
});