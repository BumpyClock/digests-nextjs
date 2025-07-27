// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
import * as Sentry from "@sentry/nextjs";
import { replayIntegration } from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable automatic error tracking
  beforeSend(event, hint) {
    // Filter out specific errors if needed
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null;
    }
    return event;
  },

  // For v9, replay sample rates are configured at the top level
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    // Automatically instrument your app to capture errors and performance data
    replayIntegration({
      // Mask all text content, but keep media playback
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // Environment
  environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",

  // User context
  beforeBreadcrumb(breadcrumb) {
    // Filter out certain breadcrumbs if needed
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }
    return breadcrumb;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    // Facebook related errors
    "fb_xd_fragment",
    // Network errors
    "NetworkError",
    "Non-Error promise rejection captured",
    // Service worker errors
    "Failed to update a ServiceWorker",
  ],

  // Deny URLs that shouldn't be tracked
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Third-party scripts
    /graph\.facebook\.com/i,
    /connect\.facebook\.net/i,
    /gtm\.js/i,
  ],
});