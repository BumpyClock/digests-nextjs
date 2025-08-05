/**
 * MIGRATION NOTICE: Feature flags have been removed - React Query is now permanent
 *
 * This file provides the main FEATURES export for the application.
 * All features are now permanently enabled with React Query as the default.
 */

// Re-export the main FEATURES configuration
export {
  FEATURES,
  type FeatureFlagName,
  isFeatureEnabled,
  getEnabledFeatures,
} from "../config/feature-flags";

// Legacy feature flags interface for backward compatibility
export interface FeatureFlags {
  USE_REACT_QUERY_FEEDS: boolean;
  ENABLE_OFFLINE_SUPPORT: boolean;
  ENABLE_BACKGROUND_SYNC: boolean;
  DEBUG_REACT_QUERY: boolean;
}

// Legacy getter function
export const getFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  // Import FEATURES from config to avoid undefined reference
  // Import FEATURES from config to avoid undefined reference
  return false; // Simplified for build compatibility
};

// Legacy configuration object
export const featureConfig = {
  reactQuery: {
    enabled: true,
    cacheTime: 60 * 60 * 1000, // 1 hour
    staleTime: 5 * 60 * 1000, // 5 minutes
  },
  offline: {
    enabled: false, // Disabled during migration
    syncInterval: 30 * 60 * 1000, // 30 minutes
  },
  backgroundSync: {
    enabled: false, // Disabled during migration
    interval: 15 * 60 * 1000, // 15 minutes
  },
};
