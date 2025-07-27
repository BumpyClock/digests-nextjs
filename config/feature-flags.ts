// ABOUTME: Feature flag configuration for progressive feature rollout
// ABOUTME: Controls which features are enabled in the application

/**
 * Central feature flag configuration
 * These flags allow for safe, progressive rollout of new features
 */
export const FEATURES = {
  /**
   * Enable React Query based authentication
   * When true, auth state is managed via React Query instead of Zustand
   * Includes offline support and token persistence
   */
  USE_REACT_QUERY_AUTH: process.env.NEXT_PUBLIC_RQ_AUTH === 'true',
  
  /**
   * Enable React Query based feed management
   * When true, feed state is managed via React Query instead of Zustand
   * Phase 2 of the state migration
   */
  USE_REACT_QUERY_FEEDS: process.env.NEXT_PUBLIC_RQ_FEEDS === 'true',
  
  /**
   * Enable debug logging for React Query operations
   */
  DEBUG_REACT_QUERY: process.env.NEXT_PUBLIC_DEBUG_RQ === 'true',
} as const

/**
 * Type-safe feature flag names
 */
export type FeatureFlagName = keyof typeof FEATURES

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return FEATURES[flag] === true
}

/**
 * Get all enabled features (for debugging)
 */
export function getEnabledFeatures(): FeatureFlagName[] {
  return (Object.keys(FEATURES) as FeatureFlagName[])
    .filter(flag => FEATURES[flag])
}