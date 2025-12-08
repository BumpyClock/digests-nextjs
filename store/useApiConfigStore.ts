// store/useApiConfigStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";
import { APIConfig, DEFAULT_API_CONFIG } from "@/lib/config";

interface ApiConfigState {
  config: APIConfig;
  setApiUrl: (url: string) => void;
  resetToDefault: () => void;
  isValidUrl: (url: string) => boolean;
}

export const useApiConfigStore = create<ApiConfigState>()(
  persist(
    (set, _get) => ({
      // Initial state
      config: DEFAULT_API_CONFIG,

      // Set a custom API URL
      setApiUrl: (url: string) => {
        // Normalize the URL - ensure it ends with a slash
        let normalizedUrl = url.trim();
        if (!normalizedUrl.endsWith("/")) {
          normalizedUrl += "/";
        }

        // Ensure it has the correct protocol
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = `https://${normalizedUrl}`;
        }

        set({
          config: {
            baseUrl: normalizedUrl,
            isCustom: normalizedUrl !== DEFAULT_API_CONFIG.baseUrl,
          },
        });
      },

      // Reset to the default API URL
      resetToDefault: () => {
        set({ config: DEFAULT_API_CONFIG });
      },

      // Check if a URL is valid
      isValidUrl: (url: string) => {
        try {
          new URL(url.startsWith("http") ? url : `https://${url}`);
          return true;
        } catch (_error) {
          return false;
        }
      },
    }),
    {
      name: "digests-api-config",
      storage: createJSONStorage(() => localforage),
    }
  )
);

// Update the getApiConfig function to use the store
export function getApiConfig(): APIConfig {
  return useApiConfigStore.getState().config;
}
