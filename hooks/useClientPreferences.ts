/**
 * Client preferences hook using localStorage (replacing Zustand)
 *
 * This hook manages UI preferences using React state and localStorage
 * instead of Zustand. This provides simpler state management for
 * client-side preferences without external dependencies.
 */

import { useState, useCallback, useEffect } from "react";

interface ClientPreferences {
  animationsEnabled: boolean;
}

const defaultPreferences: ClientPreferences = {
  animationsEnabled: true,
};

const STORAGE_KEY = "digests-ui-preferences";

export function useClientPreferences() {
  const [preferences, setPreferences] =
    useState<ClientPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences((prev) => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn("Failed to load UI preferences:", error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  const savePreferences = useCallback(
    (newPreferences: Partial<ClientPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...newPreferences };

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch (error) {
            console.warn("Failed to save UI preferences:", error);
          }
        }

        return updated;
      });
    },
    [],
  );

  const setAnimationsEnabled = useCallback(
    (enabled: boolean) => {
      savePreferences({ animationsEnabled: enabled });
    },
    [savePreferences],
  );

  return {
    preferences,
    isLoaded,
    setAnimationsEnabled,
    // Helper function for backwards compatibility
    animationsEnabled: preferences.animationsEnabled,
  };
}

// Helper function to get animation preference without hook (for backwards compatibility)
export function getAnimationsEnabled(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.animationsEnabled ?? true;
    }
  } catch (error) {
    console.warn("Failed to get animation preference:", error);
  }

  return true;
}
