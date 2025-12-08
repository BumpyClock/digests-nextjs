import { StateCreator, StoreMutatorIdentifier } from "zustand";

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(f: StateCreator<T, [], []>, name?: string) => StateCreator<T, [], []>;

/**
 * Performance monitoring middleware for Zustand stores
 * Tracks state update performance and logs slow updates
 *
 * @param config - The store configuration
 * @param name - Optional name for the store (used in logs)
 * @returns Enhanced store configuration with performance monitoring
 */
const performanceMiddlewareImpl: LoggerImpl = (config, name) => (set, get, api) =>
  config(
    (args) => {
      if (process.env.NODE_ENV === "development") {
        const start = performance.now();
        const stateBefore = get();

        // Log the action being performed
        console.log(`[${name || "Store"}] Updating:`, args);

        // Perform the actual state update
        set(args);

        const duration = performance.now() - start;
        const stateAfter = get();

        // Log slow updates (longer than one frame at 60fps)
        if (duration > 16) {
          console.warn(`[${name || "Store"}] Slow update detected: ${duration.toFixed(2)}ms`, {
            action: args,
            stateBefore,
            stateAfter,
            duration: `${duration.toFixed(2)}ms`,
          });
        }

        // Log all updates in debug mode
        if (process.env.NEXT_PUBLIC_DEBUG_STORE === "true") {
          console.log(`[${name || "Store"}] Update completed in ${duration.toFixed(2)}ms`, {
            stateBefore,
            stateAfter,
          });
        }
      } else {
        // In production, just pass through
        set(args);
      }
    },
    get,
    api
  );

export const withPerformanceMonitoring = performanceMiddlewareImpl as Logger;
