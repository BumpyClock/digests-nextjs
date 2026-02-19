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

function supportsViewTransitions(): boolean {
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

interface RunWithViewTransitionOptions {
  /**
   * Optional identifier attached to `<html>` while transition runs.
   * Used by CSS to isolate view-transition stacking for specific flows.
   */
  phaseClassName?: string;
  /**
   * Optional callback when the browser transition finishes.
   */
  onFinished?: () => void;
}

const VT_PHASE_CLASS_TIMEOUT_MS = 2000;
const vtPhaseClassCounters = new Map<string, number>();

function addPhaseClass(className: string): void {
  const count = vtPhaseClassCounters.get(className) ?? 0;
  vtPhaseClassCounters.set(className, count + 1);
  if (count === 0) {
    document.documentElement.classList.add(className);
  }
}

function removePhaseClass(className: string): void {
  const count = vtPhaseClassCounters.get(className) ?? 1;
  const nextCount = Math.max(0, count - 1);
  if (nextCount <= 0) {
    vtPhaseClassCounters.delete(className);
    document.documentElement.classList.remove(className);
    return;
  }
  vtPhaseClassCounters.set(className, nextCount);
}

export function runWithViewTransition(
  update: () => void,
  options: RunWithViewTransitionOptions = {}
): void {
  if (typeof document === "undefined") {
    update();
    options.onFinished?.();
    return;
  }

  const viewTransitionDocument = document as Document & DocumentWithViewTransition;
  if (typeof viewTransitionDocument.startViewTransition !== "function") {
    update();
    options.onFinished?.();
    return;
  }

  const { phaseClassName, onFinished } = options;
  let hasFinished = false;
  let clearTimeoutId: number | null = null;

  const finalize = () => {
    if (hasFinished) {
      return;
    }
    hasFinished = true;

    if (clearTimeoutId !== null) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    if (phaseClassName) {
      removePhaseClass(phaseClassName);
    }
    onFinished?.();
  };

  if (phaseClassName) {
    addPhaseClass(phaseClassName);
    clearTimeoutId = window.setTimeout(finalize, VT_PHASE_CLASS_TIMEOUT_MS);
  }

  let transition: unknown;

  try {
    transition = viewTransitionDocument.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });
  } catch (error) {
    finalize();
    throw error;
  }

  const maybeFinished =
    transition && typeof transition === "object" && "finished" in transition
      ? (transition as { finished?: Promise<unknown> }).finished
      : undefined;

  if (maybeFinished && typeof maybeFinished.then === "function") {
    maybeFinished.finally(finalize);
    return;
  }

  finalize();
}
