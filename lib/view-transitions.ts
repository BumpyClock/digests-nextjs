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

interface RunWithViewTransitionOptions {
  /**
   * Optional identifier attached to `<html>` while transition runs.
   * Used by CSS to isolate view-transition stacking for specific flows.
   */
  phaseClassName?: string;
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
    return;
  }

  const viewTransitionDocument = document as Document & DocumentWithViewTransition;
  if (typeof viewTransitionDocument.startViewTransition !== "function") {
    update();
    return;
  }

  const { phaseClassName } = options;
  let clearTimeoutId: number | null = null;

  const clearPhaseClass = () => {
    if (clearTimeoutId !== null) {
      window.clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    if (phaseClassName) {
      removePhaseClass(phaseClassName);
    }
  };

  if (phaseClassName) {
    addPhaseClass(phaseClassName);
    clearTimeoutId = window.setTimeout(clearPhaseClass, VT_PHASE_CLASS_TIMEOUT_MS);
  }

  const transition = viewTransitionDocument.startViewTransition(() => {
    flushSync(() => {
      update();
    });
  });

  if (!phaseClassName) {
    return;
  }

  const maybeFinished =
    transition && typeof transition === "object" && "finished" in transition
      ? (transition as { finished?: Promise<unknown> }).finished
      : undefined;
  if (maybeFinished && typeof maybeFinished.then === "function") {
    maybeFinished.finally(clearPhaseClass);
  }
}
