"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <h1 className="text-title-large text-primary-content">Unable to load this page</h1>
      <p className="max-w-xl text-body text-secondary-content">
        The content route failed to render. Please retry.
      </p>
      <Button onClick={reset}>Retry</Button>
      {error.digest && (
        <p className="text-caption text-secondary-content">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
