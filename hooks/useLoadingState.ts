"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type LoadingStateType = 
  | "idle" 
  | "loading" 
  | "success" 
  | "error" 
  | "refreshing"
  | "initializing";

export interface LoadingStateOptions {
  timeout?: number; // Auto-reset loading after timeout
  debounce?: number; // Debounce rapid state changes
  enableAutoReset?: boolean; // Auto-reset to idle after success/error
  autoResetDelay?: number; // Delay before auto-reset
}

export interface LoadingState {
  state: LoadingStateType;
  isLoading: boolean;
  isRefreshing: boolean;
  isInitializing: boolean;
  error: Error | null;
  lastUpdated: number;
}

export interface LoadingActions {
  setLoading: () => void;
  setSuccess: () => void;
  setError: (error: Error | string) => void;
  setRefreshing: () => void;
  setInitializing: () => void;
  setIdle: () => void;
  reset: () => void;
}

const defaultOptions: Required<LoadingStateOptions> = {
  timeout: 30000, // 30 seconds
  debounce: 100, // 100ms
  enableAutoReset: true,
  autoResetDelay: 2000, // 2 seconds
};

export function useLoadingState(
  initialState: LoadingStateType = "idle",
  options: LoadingStateOptions = {}
): [LoadingState, LoadingActions] {
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<LoadingStateType>(initialState);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autoResetRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
    };
  }, []);

  const updateState = useCallback((newState: LoadingStateType, newError: Error | null = null) => {
    // Clear existing timers
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (autoResetRef.current) clearTimeout(autoResetRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    debounceRef.current = setTimeout(() => {
      setState(newState);
      setError(newError);
      setLastUpdated(Date.now());

      // Set timeout for loading states
      if (newState === "loading" || newState === "refreshing" || newState === "initializing") {
        timeoutRef.current = setTimeout(() => {
          setState("error");
          setError(new Error("Operation timed out"));
          setLastUpdated(Date.now());
        }, opts.timeout);
      }

      // Auto-reset after success/error
      if (opts.enableAutoReset && (newState === "success" || newState === "error")) {
        autoResetRef.current = setTimeout(() => {
          setState("idle");
          setError(null);
          setLastUpdated(Date.now());
        }, opts.autoResetDelay);
      }
    }, opts.debounce);
  }, [opts.timeout, opts.debounce, opts.enableAutoReset, opts.autoResetDelay]);

  const actions: LoadingActions = {
    setLoading: useCallback(() => updateState("loading"), [updateState]),
    setSuccess: useCallback(() => updateState("success"), [updateState]),
    setError: useCallback((error: Error | string) => {
      const errorObj = error instanceof Error ? error : new Error(error);
      updateState("error", errorObj);
    }, [updateState]),
    setRefreshing: useCallback(() => updateState("refreshing"), [updateState]),
    setInitializing: useCallback(() => updateState("initializing"), [updateState]),
    setIdle: useCallback(() => updateState("idle"), [updateState]),
    reset: useCallback(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
      setState("idle");
      setError(null);
      setLastUpdated(Date.now());
    }, []),
  };

  const loadingState: LoadingState = {
    state,
    isLoading: state === "loading",
    isRefreshing: state === "refreshing", 
    isInitializing: state === "initializing",
    error,
    lastUpdated,
  };

  return [loadingState, actions];
}

// Hook for async operations with automatic loading state management
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: LoadingStateOptions = {}
): [LoadingState, (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined>, LoadingActions] {
  const [loadingState, actions] = useLoadingState("idle", options);

  const execute = useCallback(async (...args: Parameters<T>) => {
    try {
      actions.setLoading();
      const result = await operation(...args);
      actions.setSuccess();
      return result;
    } catch (error) {
      actions.setError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }, [operation, actions]);

  return [loadingState, execute, actions];
}

// Hook for refresh operations
export function useRefreshOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: LoadingStateOptions = {}
): [LoadingState, (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined>, LoadingActions] {
  const [loadingState, actions] = useLoadingState("idle", options);

  const refresh = useCallback(async (...args: Parameters<T>) => {
    try {
      actions.setRefreshing();
      const result = await operation(...args);
      actions.setSuccess();
      return result;
    } catch (error) {
      actions.setError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }, [operation, actions]);

  return [loadingState, refresh, actions];
}

// Hook for combining multiple loading states
export function useCombinedLoadingState(...loadingStates: LoadingState[]): LoadingState {
  const combinedState = loadingStates.reduce((combined, current) => {
    // Priority: error > loading/refreshing/initializing > success > idle
    if (current.error) return "error";
    if (current.isLoading || current.isRefreshing || current.isInitializing) {
      return current.state;
    }
    if (current.state === "success" && combined === "idle") return "success";
    return combined;
  }, "idle" as LoadingStateType);

  const combinedError = loadingStates.find(state => state.error)?.error || null;
  const lastUpdated = Math.max(...loadingStates.map(state => state.lastUpdated));

  return {
    state: combinedState,
    isLoading: loadingStates.some(state => state.isLoading),
    isRefreshing: loadingStates.some(state => state.isRefreshing),
    isInitializing: loadingStates.some(state => state.isInitializing),
    error: combinedError,
    lastUpdated,
  };
}