/**
 * API configuration hook using the centralized configuration manager
 *
 * Provides a React hook interface to the centralized API configuration system
 */

import { useState, useCallback, useEffect } from "react";
import {
  APIConfig,
  getApiConfig,
  setApiConfig,
  resetApiConfig,
} from "@/lib/config";
import { isValidApiUrl } from "@/utils/security";

export function useApiConfig() {
  const [config, setConfig] = useState<APIConfig>(() => getApiConfig());
  const [isLoaded, setIsLoaded] = useState(false);

  // Subscribe to configuration changes
  useEffect(() => {
    setIsLoaded(true);

    // For now, just get the current config since subscription is not implemented yet
    // TODO: Add proper subscription when ApiConfigManager is enhanced
    setConfig(getApiConfig());
  }, []);

  const setApiUrl = useCallback((url: string) => {
    setApiConfig(url);
    setConfig(getApiConfig());
  }, []);

  const resetToDefault = useCallback(() => {
    resetApiConfig();
    setConfig(getApiConfig());
  }, []);

  return {
    config,
    isLoaded,
    setApiUrl,
    resetToDefault,
    isValidUrl: isValidApiUrl,
  };
}

// Helper function to get API config without hook (for backwards compatibility)
export { getApiConfig } from "@/lib/config";
