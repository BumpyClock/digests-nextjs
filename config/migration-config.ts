/**
 * Configuration for Day 3 React Query migration
 * Centralized settings for auth and feed migrations
 */

import { FEATURES } from '@/lib/feature-flags'

/**
 * Migration feature flags configuration
 */
export const MIGRATION_CONFIG = {
  /**
   * Feature flags control
   */
  FEATURES: {
    AUTH_MIGRATION_ENABLED: FEATURES.USE_REACT_QUERY_AUTH,
    FEEDS_MIGRATION_ENABLED: FEATURES.USE_REACT_QUERY_FEEDS,
    OFFLINE_SUPPORT_ENABLED: FEATURES.ENABLE_OFFLINE_SUPPORT,
    BACKGROUND_SYNC_ENABLED: FEATURES.ENABLE_BACKGROUND_SYNC,
  },

  /**
   * Migration timing and safety
   */
  SAFETY: {
    // Maximum time to wait for migration completion
    MIGRATION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    
    // Maximum retry attempts before giving up
    MAX_RETRY_ATTEMPTS: 3,
    
    // Time to wait between retry attempts
    RETRY_DELAY: 5000, // 5 seconds
    
    // Whether to enable automatic rollback on failure
    AUTO_ROLLBACK_ENABLED: true,
    
    // Time to wait before clearing backups after successful migration
    BACKUP_RETENTION_TIME: 24 * 60 * 60 * 1000, // 24 hours
    
    // Maximum acceptable migration duration before warning
    PERFORMANCE_WARNING_THRESHOLD: 2 * 60 * 1000, // 2 minutes
  },

  /**
   * Data backup configuration
   */
  BACKUP: {
    // Enable comprehensive data backup before migration
    ENABLED: true,
    
    // Storage options for backups
    STORAGE: {
      AUTH_DB_NAME: 'digests-auth-backup',
      FEEDS_DB_NAME: 'digests-feed-backup',
      DB_VERSION: 1,
      STORES: ['backup', 'migration-status', 'rollback-data'],
    },
    
    // Backup validation settings
    VALIDATION: {
      CHECKSUM_ENABLED: true,
      INTEGRITY_CHECKS: true,
      STRUCTURE_VALIDATION: true,
    },
  },

  /**
   * React Query specific settings
   */
  REACT_QUERY: {
    // Cache configuration
    CACHE: {
      STALE_TIME: 5 * 60 * 1000, // 5 minutes
      GC_TIME: 30 * 60 * 1000, // 30 minutes
      REFETCH_INTERVAL: 15 * 60 * 1000, // 15 minutes
    },
    
    // Retry configuration
    RETRY: {
      MAX_ATTEMPTS: 3,
      DELAY: 1000, // 1 second
      EXPONENTIAL_BACKOFF: true,
    },
    
    // Offline support
    OFFLINE: {
      PERSIST_ENABLED: true,
      MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
      CLEANUP_THRESHOLD: 0.8, // 80% of quota
    },
  },

  /**
   * Auth migration specific settings
   */
  AUTH: {
    // Token management
    TOKENS: {
      STORAGE_TYPE: 'indexedDB', // 'localStorage' | 'indexedDB'
      ENCRYPTION_ENABLED: true,
      REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
      AUTO_REFRESH_ENABLED: true,
    },
    
    // Session monitoring
    SESSION: {
      ACTIVITY_TRACKING: true,
      INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes
      HEARTBEAT_INTERVAL: 60 * 1000, // 1 minute
    },
    
    // Security settings
    SECURITY: {
      SECURE_STORAGE: true,
      TOKEN_VALIDATION: true,
      CSRF_PROTECTION: true,
    },
  },

  /**
   * Feed migration specific settings
   */
  FEEDS: {
    // Data synchronization
    SYNC: {
      BATCH_SIZE: 50, // Items per batch
      PARALLEL_FEEDS: 5, // Max concurrent feed refreshes
      DEBOUNCE_TIME: 1000, // 1 second
    },
    
    // Cache management
    CACHE: {
      MAX_ITEMS_PER_FEED: 1000,
      ITEM_RETENTION_DAYS: 30,
      AUTO_CLEANUP_ENABLED: true,
    },
    
    // Background refresh
    BACKGROUND: {
      ENABLED: true,
      INTERVAL: 30 * 60 * 1000, // 30 minutes
      ON_FOCUS_REFETCH: true,
      ON_RECONNECT_REFETCH: true,
    },
  },

  /**
   * Performance monitoring
   */
  PERFORMANCE: {
    // Memory thresholds
    MEMORY: {
      WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB
      CRITICAL_THRESHOLD: 100 * 1024 * 1024, // 100MB
      CLEANUP_ENABLED: true,
    },
    
    // Storage quotas
    STORAGE: {
      WARNING_PERCENTAGE: 0.8, // 80% of quota
      CRITICAL_PERCENTAGE: 0.95, // 95% of quota
      AUTO_CLEANUP_ENABLED: true,
    },
    
    // Performance metrics
    METRICS: {
      ENABLED: process.env.NODE_ENV === 'development',
      COLLECTION_INTERVAL: 30000, // 30 seconds
      RETENTION_DAYS: 7,
    },
  },

  /**
   * Development and debugging
   */
  DEVELOPMENT: {
    // Enhanced logging in development
    VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
    
    // Migration simulation options
    SIMULATION: {
      ENABLED: false,
      FORCE_FAILURES: false,
      SLOW_MIGRATION: false,
    },
    
    // Testing options
    TESTING: {
      MOCK_API_CALLS: false,
      BYPASS_VALIDATION: false,
      FAST_MIGRATION: false,
    },
  },

  /**
   * Environment-specific overrides
   */
  ENVIRONMENT: {
    PRODUCTION: {
      VERBOSE_LOGGING: false,
      AUTO_ROLLBACK_ENABLED: true,
      BACKUP_ENABLED: true,
      PERFORMANCE_MONITORING: true,
    },
    
    DEVELOPMENT: {
      VERBOSE_LOGGING: true,
      AUTO_ROLLBACK_ENABLED: true,
      BACKUP_ENABLED: true,
      PERFORMANCE_MONITORING: true,
    },
    
    TEST: {
      VERBOSE_LOGGING: false,
      AUTO_ROLLBACK_ENABLED: false,
      BACKUP_ENABLED: false,
      PERFORMANCE_MONITORING: false,
      MIGRATION_TIMEOUT: 30000, // 30 seconds for tests
    },
  },
} as const

/**
 * Get environment-specific configuration
 */
export function getMigrationConfig() {
  const env = process.env.NODE_ENV || 'development'
  const baseConfig = MIGRATION_CONFIG
  
  // Apply environment-specific overrides
  const envOverrides = baseConfig.ENVIRONMENT[env as keyof typeof baseConfig.ENVIRONMENT] || 
                      baseConfig.ENVIRONMENT.DEVELOPMENT

  return {
    ...baseConfig,
    ...envOverrides,
  }
}

/**
 * Validate migration configuration
 */
export function validateMigrationConfig(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const config = getMigrationConfig()

  // Check required features
  if (!config.FEATURES.AUTH_MIGRATION_ENABLED && !config.FEATURES.FEEDS_MIGRATION_ENABLED) {
    errors.push('At least one migration feature must be enabled')
  }

  // Check timeout values
  if (config.SAFETY.MIGRATION_TIMEOUT < 30000) {
    warnings.push('Migration timeout is very short (< 30s)')
  }

  // Check retry settings
  if (config.SAFETY.MAX_RETRY_ATTEMPTS > 5) {
    warnings.push('High retry count may cause extended delays')
  }

  // Check cache sizes
  if (config.REACT_QUERY.OFFLINE.MAX_CACHE_SIZE > 100 * 1024 * 1024) {
    warnings.push('Large cache size may impact performance')
  }

  // Check storage availability
  if (typeof window !== 'undefined') {
    if (!('indexedDB' in window) && config.AUTH.TOKENS.STORAGE_TYPE === 'indexedDB') {
      warnings.push('IndexedDB not available, will fall back to localStorage')
    }
    
    if (!('localStorage' in window)) {
      errors.push('No storage mechanisms available')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Migration phase configuration
 */
export const MIGRATION_PHASES = {
  PRE_MIGRATION: {
    name: 'Pre-Migration',
    steps: [
      'Validate environment',
      'Check feature flags',
      'Create backups',
      'Run pre-flight checks',
    ],
    estimatedDuration: 30000, // 30 seconds
  },
  
  AUTH_MIGRATION: {
    name: 'Auth Migration',
    steps: [
      'Initialize React Query auth',
      'Migrate user state',
      'Migrate tokens',
      'Validate auth state',
      'Update feature flags',
    ],
    estimatedDuration: 60000, // 1 minute
  },
  
  FEEDS_MIGRATION: {
    name: 'Feeds Migration',
    steps: [
      'Initialize React Query feeds',
      'Migrate feed data',
      'Migrate feed items',
      'Migrate read status',
      'Validate feed state',
    ],
    estimatedDuration: 120000, // 2 minutes
  },
  
  POST_MIGRATION: {
    name: 'Post-Migration',
    steps: [
      'Final validation',
      'Clean up old data',
      'Update configuration',
      'Clear temporary data',
    ],
    estimatedDuration: 30000, // 30 seconds
  },
} as const

/**
 * Export types for type safety
 */
export type MigrationConfigType = typeof MIGRATION_CONFIG
export type MigrationPhase = keyof typeof MIGRATION_PHASES

/**
 * Utility function to check if a specific migration is enabled
 */
export function isMigrationEnabled(migration: 'auth' | 'feeds'): boolean {
  const config = getMigrationConfig()
  
  switch (migration) {
    case 'auth':
      return config.FEATURES.AUTH_MIGRATION_ENABLED
    case 'feeds':
      return config.FEATURES.FEEDS_MIGRATION_ENABLED
    default:
      return false
  }
}

/**
 * Get estimated total migration duration
 */
export function getEstimatedMigrationDuration(): number {
  const config = getMigrationConfig()
  
  let totalDuration = MIGRATION_PHASES.PRE_MIGRATION.estimatedDuration + 
                     MIGRATION_PHASES.POST_MIGRATION.estimatedDuration

  if (config.FEATURES.AUTH_MIGRATION_ENABLED) {
    totalDuration += MIGRATION_PHASES.AUTH_MIGRATION.estimatedDuration
  }

  if (config.FEATURES.FEEDS_MIGRATION_ENABLED) {
    totalDuration += MIGRATION_PHASES.FEEDS_MIGRATION.estimatedDuration
  }

  return totalDuration
}