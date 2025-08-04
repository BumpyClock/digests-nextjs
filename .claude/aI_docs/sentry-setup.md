# Sentry Error Monitoring Setup

This document describes the Sentry error monitoring infrastructure implemented in the Digests NextJS application.

## Overview

We've integrated Sentry for comprehensive error tracking across both client and server environments. The setup includes:

- Client-side error tracking
- Server-side error tracking
- Edge function error tracking
- Source map uploading for production debugging
- Error boundaries for graceful error handling
- Custom error handling utilities

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```env
# Required: Your Sentry DSN (Data Source Name)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Required for source map uploads
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Environment name
NEXT_PUBLIC_ENV=development

# Optional: Custom release name (defaults to git commit SHA)
SENTRY_RELEASE=1.0.0
```

### Getting Started

1. Create a Sentry account at https://sentry.io
2. Create a new project for your application
3. Copy the DSN from your project settings
4. Generate an auth token from Settings > Account > API > Auth Tokens
5. Update your environment variables

## Features

### Error Boundaries

We've implemented error boundaries at multiple levels:

1. **Global Error Boundary** (`app/global-error.tsx`)

   - Catches errors that escape all other boundaries
   - Only active in production

2. **Root Error Boundary** (`app/error.tsx`)

   - Catches errors in the main application
   - Provides user-friendly error UI

3. **Component Error Boundary** (`components/error-boundary.tsx`)
   - Reusable error boundary for wrapping components
   - Integrated with existing Logger utility
   - Customizable fallback UI

### Error Handling Utilities

#### `utils/sentry.ts`

Provides helper functions for enhanced error tracking:

- `setSentryUser()` - Set user context
- `setSentryContext()` - Add custom context
- `addSentryBreadcrumb()` - Add navigation breadcrumbs
- `captureMessage()` - Log non-error messages
- `captureException()` - Capture errors with context
- `monitorAsyncOperation()` - Performance monitoring
- `withErrorBoundary()` - Wrap functions with error handling

#### `hooks/use-error-handling.ts`

React hook for component-level error handling:

```typescript
const { handleError, handleAsyncError, createErrorHandler } =
  useErrorHandling();

// Handle errors manually
try {
  // risky operation
} catch (error) {
  handleError(error, {
    showToast: true,
    context: { component: "FeedList" },
  });
}

// Handle async operations
const result = await handleAsyncError(async () => fetchFeeds(), {
  fallbackMessage: "Failed to load feeds",
});
```

### Source Maps

Source maps are automatically generated and uploaded to Sentry during production builds:

- Generated with `productionBrowserSourceMaps: true`
- Uploaded via Sentry Webpack plugin
- Hidden from public access for security
- Enables accurate error stack traces in production

### Performance Monitoring

- Automatic performance tracking for API routes
- Transaction sampling at 10% in production
- Custom performance monitoring via `monitorAsyncOperation()`

### Session Replay

Session replay is enabled to help debug user issues:

- 10% of sessions recorded in production
- 100% of sessions with errors recorded
- Text content masked for privacy
- Media playback preserved

## Usage Examples

### Capturing Errors

```typescript
import { captureException } from "@/utils/sentry";

try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, {
    operation: "riskyOperation",
    userId: currentUser.id,
  });
}
```

### Adding Context

```typescript
import { setSentryContext, addSentryBreadcrumb } from "@/utils/sentry";

// Add feed context
setSentryContext("feed", {
  feedId: feed.id,
  feedUrl: feed.url,
  itemCount: feed.items.length,
});

// Add navigation breadcrumb
addSentryBreadcrumb("Navigated to feed", "navigation", "info", {
  feedId: feed.id,
});
```

### Using Error Boundaries

```tsx
import ErrorBoundary from "@/components/error-boundary";

function MyComponent() {
  return (
    <ErrorBoundary>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

## Monitoring Dashboard

Access your error monitoring dashboard at:
https://sentry.io/organizations/[your-org]/projects/[your-project]

Key metrics to monitor:

- Error rate trends
- Most frequent errors
- User impact (affected users)
- Performance metrics
- Session replay for debugging

## Best Practices

1. **Don't Log Sensitive Data**

   - User passwords
   - API keys
   - Personal information

2. **Use Context Wisely**

   - Add relevant context to errors
   - Include user actions and state
   - Avoid large data dumps

3. **Handle Expected Errors**

   - Use try-catch for known failure points
   - Provide user-friendly error messages
   - Only send unexpected errors to Sentry

4. **Test Error Handling**
   - Test error boundaries in development
   - Verify error messages are helpful
   - Ensure sensitive data isn't exposed

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check environment variables are set correctly
2. Verify DSN is correct
3. Check browser console for Sentry initialization errors
4. Ensure errors aren't filtered by `ignoreErrors` config

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check build logs for upload errors
3. Ensure release name matches between app and Sentry
4. Verify source maps are being generated

### Performance Issues

1. Reduce `tracesSampleRate` if needed
2. Disable session replay in high-traffic scenarios
3. Use `beforeSend` to filter unnecessary errors
