import React, { useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { Logger } from "@/utils/logger";

interface ErrorHandlingOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  context?: Record<string, unknown>;
  onError?: (error: Error) => void;
}

export function useErrorHandling() {
  const handleError = useCallback(
    (error: Error, options: ErrorHandlingOptions = {}) => {
      const {
        showToast = true,
        fallbackMessage = "An unexpected error occurred",
        context,
        onError,
      } = options;

      // Log to console and logger
      Logger.error("Error captured by useErrorHandling", error);
      console.error("Error:", error);

      // Capture in Sentry with context
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext("errorHandling", context);
        }
        scope.setLevel("error");
        Sentry.captureException(error);
      });

      // Show toast notification if enabled
      if (showToast) {
        const message = error.message || fallbackMessage;
        toast.error(message, {
          duration: 5000,
          action: {
            label: "Dismiss",
            onClick: () => {},
          },
        });
      }

      // Call custom error handler if provided
      if (onError) {
        onError(error);
      }
    },
    [],
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlingOptions = {},
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error as Error, options);
        return null;
      }
    },
    [handleError],
  );

  const createErrorHandler = useCallback(
    (componentName: string, options: ErrorHandlingOptions = {}) => {
      return (error: Error) => {
        handleError(error, {
          ...options,
          context: {
            component: componentName,
            ...options.context,
          },
        });
      };
    },
    [handleError],
  );

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
  };
}

// HOC to wrap components with error handling
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
) {
  return function WithErrorHandlingComponent(props: P) {
    const { createErrorHandler } = useErrorHandling();
    const errorHandler = createErrorHandler(
      componentName || Component.displayName || Component.name || "Unknown",
    );

    // This would need to be wrapped in an error boundary
    // The error handler is passed as a prop for manual error handling
    return React.createElement(Component, {
      ...props,
      onError: errorHandler,
    } as P);
  };
}
