import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

interface DocumentWithViewTransition {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => unknown;
}

export function getViewTransitionStyle(
  enabled: boolean,
  transitionName: string
): CSSProperties | undefined {
  if (!enabled) {
    return undefined;
  }

  return { viewTransitionName: transitionName } as CSSProperties;
}

export function supportsViewTransitions(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const viewTransitionDocument = document as Document & DocumentWithViewTransition;
  return typeof viewTransitionDocument.startViewTransition === "function";
}

// Cached client-side result — computed once after first hydration
let _vtCached: boolean | null = null;

/**
 * Hydration-safe hook: returns false on the server and on the first client
 * render (matching SSR output), then updates to the real value after mount.
 */
export function useViewTransitionsSupported(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    if (_vtCached === null) {
      _vtCached = supportsViewTransitions();
    }
    setSupported(_vtCached);
  }, []);
  return supported;
}

export function runWithViewTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const viewTransitionDocument = document as Document & DocumentWithViewTransition;
  if (typeof viewTransitionDocument.startViewTransition !== "function") {
    update();
    return;
  }

  viewTransitionDocument.startViewTransition(() => {
    flushSync(() => {
      update();
    });
  });
}
