/**
 * Application configuration values
 */

import { isValidApiUrl } from "@/utils/security";

export interface APIConfig {
  baseUrl: string;
  isCustom: boolean;
}

export const DEFAULT_API_CONFIG: APIConfig = {
  baseUrl: "https://api.digests.app",
  isCustom: false,
};

/**
 * Gets the environment base URL with proper fallback
 */
export function getEnvironmentBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_CONFIG.baseUrl;
}

/**
 * Simple API configuration manager - single source of truth
 */
class ApiConfigManager {
  private static instance: ApiConfigManager;
  private config: APIConfig;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    const baseUrl = getEnvironmentBaseUrl();
    this.config = {
      baseUrl,
      isCustom: baseUrl !== DEFAULT_API_CONFIG.baseUrl,
    };
  }

  static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager();
    }
    return ApiConfigManager.instance;
  }

  getConfig(): APIConfig {
    return { ...this.config };
  }

  setConfig(baseUrl: string): void {
    // Normalize and validate the URL
    const normalizedUrl = this.normalizeUrl(baseUrl);

    if (!isValidApiUrl(normalizedUrl)) {
      throw new Error(`Invalid API URL: ${baseUrl}`);
    }

    this.config = {
      baseUrl: normalizedUrl,
      isCustom: normalizedUrl !== DEFAULT_API_CONFIG.baseUrl,
    };
    this.notifyListeners();
  }

  private normalizeUrl(url: string): string {
    let normalizedUrl = url.trim();

    // Remove trailing slash for consistency
    if (normalizedUrl.endsWith("/")) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }

    // Ensure it has the correct protocol
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    return normalizedUrl;
  }

  resetToDefault(): void {
    const baseUrl = getEnvironmentBaseUrl();
    this.config = {
      baseUrl,
      isCustom: baseUrl !== DEFAULT_API_CONFIG.baseUrl,
    };
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Export simple functions for backward compatibility
export function getApiConfig(): APIConfig {
  return ApiConfigManager.getInstance().getConfig();
}

export function setApiConfig(baseUrl: string): void {
  ApiConfigManager.getInstance().setConfig(baseUrl);
}

export function resetApiConfig(): void {
  ApiConfigManager.getInstance().resetToDefault();
}

/**
 * Returns the API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  const config = getApiConfig();
  return `${config.baseUrl}${endpoint}`;
}
