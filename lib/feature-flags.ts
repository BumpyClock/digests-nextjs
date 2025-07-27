/**
 * Feature flags for progressive rollout of new features
 * All flags should be environment-based for easy toggling
 */

/**
 * Feature flag configuration
 */
export const FEATURES = {
  /**
   * Use React Query for feed state management instead of Zustand
   * When enabled, feeds will be fetched and cached via React Query
   * with offline support and background sync
   */
  USE_REACT_QUERY_FEEDS: process.env.NEXT_PUBLIC_RQ_FEEDS === 'true',

  /**
   * Enable React Query auth migration (for coordination with Stream A)
   */
  USE_REACT_QUERY_AUTH: process.env.NEXT_PUBLIC_RQ_AUTH === 'true',

  /**
   * Enable offline support features (requires React Query migrations)
   */
  ENABLE_OFFLINE_SUPPORT: process.env.NEXT_PUBLIC_OFFLINE_SUPPORT === 'true',

  /**
   * Enable background sync for feeds
   */
  ENABLE_BACKGROUND_SYNC: process.env.NEXT_PUBLIC_BACKGROUND_SYNC === 'true',
} as const

/**
 * Type-safe feature flag keys
 */
export type FeatureFlag = keyof typeof FEATURES

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag] ?? false
}

/**
 * Get all enabled features (useful for debugging)
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[])
    .filter(flag => FEATURES[flag])
}

/**
 * Log enabled features (development only)
 */
if (process.env.NODE_ENV === 'development') {
  const enabledFeatures = getEnabledFeatures()
  if (enabledFeatures.length > 0) {
    console.log('[Feature Flags] Enabled features:', enabledFeatures)
  }
}