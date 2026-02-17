"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WebAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <h1 className="text-title-large text-primary-content">Something went wrong</h1>
      <p className="max-w-xl text-body text-secondary-content">
        We hit an unexpected error in the app surface. You can retry this view.
      </p>
      <Button onClick={reset}>Try again</Button>
      {error.digest && (
        <p className="text-caption text-secondary-content">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
