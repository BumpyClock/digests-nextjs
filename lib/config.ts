/**
 * Application configuration values
 */

export interface APIConfig {
  baseUrl: string;
  isCustom: boolean;
}

export const DEFAULT_API_CONFIG: APIConfig = {
  baseUrl: 'https://api.digests.app',
  isCustom: false
};

/**
 * Returns the API URL for a specific endpoint
 * @param endpoint The API endpoint path
 * @returns The complete API URL
 */
export function getApiUrl(endpoint: string): string {
  // This is a function so it can be dynamically updated
  // when the store changes the API endpoint
  const config = getApiConfig();
  return `${config.baseUrl}${endpoint}`;
}

/**
 * Returns the current API configuration
 * This is a placeholder that will be replaced by the actual implementation in useApiConfigStore.ts
 * To avoid circular dependencies, we define this here and override it in the store
 */
export function getApiConfig(): APIConfig {
  // This will be overridden by the store's implementation
  return DEFAULT_API_CONFIG;
}