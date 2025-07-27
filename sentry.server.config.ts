// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",

  // Integrations
  integrations: [
    // Automatically capture unhandled promise rejections
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],

  // Performance monitoring
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter transactions
  beforeSendTransaction(transaction) {
    // Don't send transactions for health checks
    if (transaction.transaction?.includes('/api/health')) {
      return null;
    }
    return transaction;
  },

  // Enhanced error context
  beforeSend(event) {
    // Add server-specific context
    if (event.request) {
      // Sanitize sensitive headers
      const headers = { ...event.request.headers };
      delete headers.cookie;
      delete headers.authorization;
      event.request.headers = headers;
    }
    return event;
  },
});