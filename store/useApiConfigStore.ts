/**
 * API Configuration Store - Simplified to use centralized config
 * Provides backward compatibility with the original Zustand-based interface
 */

import {
  getApiConfig as getCentralizedApiConfig,
  setApiConfig,
  resetApiConfig,
  APIConfig,
} from "@/lib/config";
import { isValidApiUrl } from "@/utils/security";

// Enhanced API config store interface for backward compatibility
interface ApiConfigStore {
  config: APIConfig;
  baseUrl: string;
  setApiUrl: (url: string) => void;
  setBaseUrl: (url: string) => void;
  resetToDefault: () => void;
  isValidUrl: (url: string) => boolean;
}

// Backward compatibility getter - delegates to centralized config
export const getApiConfig = (): APIConfig => {
  return getCentralizedApiConfig();
};

// Enhanced stub store for backward compatibility
export const useApiConfigStore = (): ApiConfigStore => {
  const config = getCentralizedApiConfig();

  return {
    config,
    baseUrl: config.baseUrl,
    setApiUrl: (url: string) => {
      if (isValidApiUrl(url)) {
        setApiConfig(url);
      } else {
        console.warn("Invalid API URL provided:", url);
      }
    },
    setBaseUrl: (url: string) => {
      if (isValidApiUrl(url)) {
        setApiConfig(url);
      } else {
        console.warn("Invalid base URL provided:", url);
      }
    },
    resetToDefault: () => {
      resetApiConfig();
    },
    isValidUrl: isValidApiUrl,
  };
};

// Add getState method for compatibility
const getStateMethod = () => {
  const store = useApiConfigStore();
  return store;
};

useApiConfigStore.getState = getStateMethod;
