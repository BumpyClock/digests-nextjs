// ABOUTME: Application configuration - React Query is the permanent state management system
// ABOUTME: All features are permanently enabled - auth has been removed

/**
 * Application features - all permanently enabled
 * React Query migration is complete and committed
 */
export const FEATURES = {
  /**
   * React Query based feed management - PERMANENTLY ENABLED
   * Feed state is managed via React Query with caching and background sync
   */
  USE_REACT_QUERY_FEEDS: true,

  /**
   * Debug logging for React Query operations - PERMANENTLY ENABLED
   */
  DEBUG_REACT_QUERY: true,

  /**
   * Offline support - DISABLED during migration
   */
  ENABLE_OFFLINE_SUPPORT: false,

  /**
   * Background sync - DISABLED during migration
   */
  ENABLE_BACKGROUND_SYNC: false,
} as const;

/**
 * Type-safe feature flag names
 * @deprecated - All features are permanently enabled
 */
export type FeatureFlagName = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 * @deprecated - All features are permanently enabled, always returns true
 */
export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return true; // All features permanently enabled
}

/**
 * Get all enabled features
 * @deprecated - All features are permanently enabled
 */
export function getEnabledFeatures(): FeatureFlagName[] {
  return Object.keys(FEATURES) as FeatureFlagName[];
}
