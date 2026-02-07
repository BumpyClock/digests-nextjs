import type { CSSProperties } from "react";
import { flushSync } from "react-dom";

interface DocumentWithViewTransition extends Document {
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

  const viewTransitionDocument = document as DocumentWithViewTransition;
  return typeof viewTransitionDocument.startViewTransition === "function";
}

export function runWithViewTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const viewTransitionDocument = document as DocumentWithViewTransition;
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
