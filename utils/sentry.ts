import * as Sentry from '@sentry/nextjs';

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
}

/**
 * Set user context for Sentry error tracking
 */
export function setSentryUser(user: UserContext | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context);
}

/**
 * Add breadcrumb for better error tracking
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture a message (not an error) in Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('additional', context);
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  category: string,
  data?: Record<string, any>
) {
  addSentryBreadcrumb(`Event: ${eventName}`, category, 'info', data);
}

/**
 * Monitor performance of an async operation
 */
export async function monitorAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return await Sentry.startSpan(
    {
      name: operationName,
      op: 'custom',
    },
    async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: 1, message: 'ok' });
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: 'internal_error' });
        captureException(error as Error, {
          operation: operationName,
          ...context,
        });
        throw error;
      }
    }
  );
}

/**
 * Create a wrapped version of a function that captures errors
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, {
            function: fn.name,
            arguments: args,
            ...context,
          });
          throw error;
        });
      }
      return result;
    } catch (error) {
      captureException(error as Error, {
        function: fn.name,
        arguments: args,
        ...context,
      });
      throw error;
    }
  }) as T;
}