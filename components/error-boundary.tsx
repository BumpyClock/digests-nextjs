"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { Logger } from "@/utils/logger";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Oops! Something went wrong</h2>
          <p className="text-muted-foreground">
            We encountered an error while processing your request. Don&apos;t worry,
            we&apos;ve been notified.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
              Error details (development only)
            </summary>
            <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-40">
              <p className="font-semibold text-destructive">{error.name}</p>
              <p className="mt-1">{error.message}</p>
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    Logger.error("ErrorBoundary caught an error", error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error("Uncaught error:", error, errorInfo);

    // Call onError prop if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error("Error in onError callback:", callbackError);
      }
    }

    // Log to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setContext("errorBoundary", {
        componentStack: errorInfo.componentStack,
      });
      scope.setLevel("error");
      Sentry.captureException(error);
    });
  }

  public resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    Logger.error("Error handled by hook", error);

    Sentry.withScope((scope) => {
      if (errorInfo?.componentStack) {
        scope.setContext("errorBoundary", {
          componentStack: errorInfo.componentStack,
        });
      }
      Sentry.captureException(error);
    });

    if (process.env.NODE_ENV === "development") {
      console.error("Error handled:", error, errorInfo);
    }
  };
}

export default ErrorBoundary;
