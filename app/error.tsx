"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Something went wrong!</h2>
          <p className="text-muted-foreground">
            An error occurred while loading this page. We&apos;ve been notified and
            are working on a fix.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
              Error details (development only)
            </summary>
            <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-40">
              <p className="font-semibold text-destructive">{error.name}</p>
              <p className="mt-1">{error.message}</p>
              {error.digest && (
                <p className="mt-1 text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={reset}
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
