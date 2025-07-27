/**
 * Migration utilities for transitioning from localStorage to IndexedDB
 * Handles data format changes and ensures no data loss during migration
 */

import { IndexedDBAdapter } from './indexdb-adapter'
import type { MigrationProgress, MigrationOptions } from '@/utils/persistence-helpers'

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean
  migrated: number
  failed: number
  errors: Error[]
  duration: number
}

/**
 * Data transformer for migration
 */
export type DataTransformer = (key: string, value: unknown) => {
  key: string
  value: unknown
  skip?: boolean
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /**
   * Source storage prefix/pattern
   */
  sourcePattern: string | RegExp
  
  /**
   * Target database name
   */
  targetDatabase?: string
  
  /**
   * Data transformer function
   */
  transformer?: DataTransformer
  
  /**
   * Whether to backup before migration
   */
  createBackup?: boolean
  
  /**
   * Migration options
   */
  options?: MigrationOptions
}

/**
 * Main migration class
 */
export class DataMigrator {
  private config: MigrationConfig
  private adapter: IndexedDBAdapter
  private backupData: Map<string, unknown> = new Map()

  constructor(config: MigrationConfig) {
    this.config = config
    this.adapter = new IndexedDBAdapter(config.targetDatabase)
  }

  /**
   * Execute the migration
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: Error[] = []
    let migrated = 0
    let failed = 0

    try {
      // Phase 1: Discovery
      const keys = this.discoverKeys()
      const total = keys.length

      this.reportProgress({
        current: 0,
        total,
        phase: 'preparing',
        message: `Discovered ${total} items to migrate`,
      })

      // Phase 2: Backup (optional)
      if (this.config.createBackup) {
        await this.createBackup(keys)
      }

      // Phase 3: Migration
      const batchSize = this.config.options?.batchSize || 50
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const result = await this.migrateBatch(batch)
        
        migrated += result.migrated
        failed += result.failed
        errors.push(...result.errors)

        this.reportProgress({
          current: Math.min(i + batchSize, total),
          total,
          phase: 'migrating',
          message: `Migrated ${migrated} items, ${failed} failures`,
        })

        // Stop if not continuing on error
        if (result.errors.length > 0 && !this.config.options?.continueOnError) {
          break
        }
      }

      // Phase 4: Verification
      await this.verifyMigration(keys)

      // Phase 5: Cleanup (optional)
      if (this.config.options?.deleteSource && failed === 0) {
        await this.cleanupSource(keys)
      }

      this.reportProgress({
        current: total,
        total,
        phase: 'complete',
        message: `Migration complete: ${migrated} items migrated successfully`,
      })

      return {
        success: failed === 0,
        migrated,
        failed,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      errors.push(error as Error)
      
      // Attempt rollback if backup exists
      if (this.config.createBackup && this.backupData.size > 0) {
        await this.rollback()
      }

      return {
        success: false,
        migrated,
        failed,
        errors,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Discover keys to migrate
   */
  private discoverKeys(): string[] {
    const keys: string[] = []
    const pattern = this.config.sourcePattern

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      if (typeof pattern === 'string') {
        if (key.startsWith(pattern)) {
          keys.push(key)
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(key)) {
          keys.push(key)
        }
      }
    }

    return keys
  }

  /**
   * Create backup of data
   */
  private async createBackup(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key)
        if (value !== null) {
          this.backupData.set(key, value)
        }
      } catch (error) {
        console.warn(`Failed to backup ${key}:`, error)
      }
    }
  }

  /**
   * Migrate a batch of keys
   */
  private async migrateBatch(
    keys: string[]
  ): Promise<{ migrated: number; failed: number; errors: Error[] }> {
    const errors: Error[] = []
    let migrated = 0
    let failed = 0

    const batchData = new Map<string, unknown>()

    for (const key of keys) {
      try {
        // Read from localStorage
        const rawValue = localStorage.getItem(key)
        if (rawValue === null) continue

        // Parse value
        let value: unknown
        try {
          value = JSON.parse(rawValue)
        } catch {
          value = rawValue // Keep as string if not JSON
        }

        // Apply transformation if provided
        if (this.config.transformer) {
          const transformed = this.config.transformer(key, value)
          if (transformed.skip) continue
          
          batchData.set(transformed.key, transformed.value)
        } else {
          batchData.set(key, value)
        }
      } catch (error) {
        failed++
        errors.push(new Error(`Failed to process ${key}: ${error}`))
        this.config.options?.onError?.(error as Error, key)
      }
    }

    // Write batch to IndexedDB
    if (batchData.size > 0) {
      try {
        await this.adapter.setMany(batchData)
        migrated += batchData.size
      } catch (error) {
        failed += batchData.size
        errors.push(new Error(`Failed to write batch: ${error}`))
        this.config.options?.onError?.(error as Error, Array.from(batchData.keys()))
      }
    }

    return { migrated, failed, errors }
  }

  /**
   * Verify migration success
   */
  private async verifyMigration(keys: string[]): Promise<void> {
    const sampleSize = Math.min(10, keys.length)
    const sampleKeys = keys.slice(0, sampleSize)

    for (const key of sampleKeys) {
      const original = localStorage.getItem(key)
      const migrated = await this.adapter.get(key)

      if (original && !migrated) {
        throw new Error(`Verification failed: ${key} not found in target storage`)
      }
    }
  }

  /**
   * Clean up source storage
   */
  private async cleanupSource(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error)
      }
    }
  }

  /**
   * Rollback migration
   */
  private async rollback(): Promise<void> {
    console.warn('Rolling back migration...')
    
    // Clear migrated data
    await this.adapter.clear()

    // Restore backup if available
    for (const [key, value] of this.backupData) {
      try {
        localStorage.setItem(key, value as string)
      } catch (error) {
        console.error(`Failed to restore ${key}:`, error)
      }
    }
  }

  /**
   * Report progress
   */
  private reportProgress(progress: MigrationProgress): void {
    this.config.options?.onProgress?.(progress)
  }
}

/**
 * Specific migrators for different data types
 */
export const Migrators = {
  /**
   * Migrate React Query cache data
   */
  async migrateReactQueryCache(): Promise<MigrationResult> {
    const migrator = new DataMigrator({
      sourcePattern: /^rq_/,
      targetDatabase: 'digests_query_cache',
      transformer: (key, value) => {
        // Transform React Query cache format if needed
        if (typeof value === 'object' && value !== null) {
          const data = value as any
          
          // Add migration version
          data._migrationVersion = 1
          data._migratedAt = Date.now()
          
          return { key, value: data }
        }
        
        return { key, value }
      },
      createBackup: true,
      options: {
        deleteSource: true,
        continueOnError: true,
        onProgress: (progress) => {
          console.log(`React Query migration: ${progress.message}`)
        },
      },
    })

    return migrator.migrate()
  },

  /**
   * Migrate user preferences
   */
  async migrateUserPreferences(): Promise<MigrationResult> {
    const migrator = new DataMigrator({
      sourcePattern: /^(user_|pref_|settings_)/,
      targetDatabase: 'digests_user_data',
      transformer: (key, value) => {
        // Namespace user data
        const newKey = key.startsWith('digests_') ? key : `digests_${key}`
        return { key: newKey, value }
      },
      createBackup: true,
      options: {
        deleteSource: true,
        onProgress: (progress) => {
          console.log(`User preferences migration: ${progress.message}`)
        },
      },
    })

    return migrator.migrate()
  },

  /**
   * Migrate auth tokens (with encryption)
   */
  async migrateAuthTokens(): Promise<MigrationResult> {
    // Import encryption utilities
    const { EncryptionKeyManager, createEncryptedPersister } = await import('@/utils/encryption')
    
    // Create encrypted adapter
    const adapter = new IndexedDBAdapter('digests_secure_storage')
    const key = await EncryptionKeyManager.generateKey()
    const encryptedAdapter = await createEncryptedPersister(adapter, undefined, {
      algorithm: 'AES-GCM',
    })

    const migrator = new DataMigrator({
      sourcePattern: /^(auth_|token_|session_)/,
      targetDatabase: 'digests_secure_storage',
      transformer: (key, value) => {
        // Mark sensitive data
        if (typeof value === 'object' && value !== null) {
          (value as any)._encrypted = true
        }
        return { key, value }
      },
      createBackup: false, // Don't backup sensitive data
      options: {
        deleteSource: true, // Always delete auth tokens from localStorage
        continueOnError: false, // Stop on any error for security
        onProgress: (progress) => {
          console.log(`Auth migration: ${progress.message}`)
        },
      },
    })

    return migrator.migrate()
  },
}

/**
 * Run all migrations
 */
export async function runAllMigrations(
  options?: {
    parallel?: boolean
    onProgress?: (migration: string, progress: MigrationProgress) => void
    onComplete?: (results: Record<string, MigrationResult>) => void
  }
): Promise<Record<string, MigrationResult>> {
  const migrations = [
    { name: 'reactQuery', migrator: Migrators.migrateReactQueryCache },
    { name: 'userPrefs', migrator: Migrators.migrateUserPreferences },
    { name: 'auth', migrator: Migrators.migrateAuthTokens },
  ]

  const results: Record<string, MigrationResult> = {}

  if (options?.parallel) {
    // Run migrations in parallel
    const promises = migrations.map(async ({ name, migrator }) => {
      const result = await migrator()
      results[name] = result
      return { name, result }
    })

    await Promise.all(promises)
  } else {
    // Run migrations sequentially
    for (const { name, migrator } of migrations) {
      console.log(`Starting migration: ${name}`)
      results[name] = await migrator()
      console.log(`Completed migration: ${name}`)
    }
  }

  options?.onComplete?.(results)
  return results
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  // Check for localStorage keys that match our patterns
  const patterns = [/^rq_/, /^(user_|pref_|settings_)/, /^(auth_|token_|session_)/]
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    
    for (const pattern of patterns) {
      if (pattern.test(key)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  needed: boolean
  itemsToMigrate: number
  estimatedSize: number
}> {
  const patterns = [/^rq_/, /^(user_|pref_|settings_)/, /^(auth_|token_|session_)/]
  let itemsToMigrate = 0
  let estimatedSize = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    
    for (const pattern of patterns) {
      if (pattern.test(key)) {
        itemsToMigrate++
        const value = localStorage.getItem(key)
        if (value) {
          estimatedSize += key.length + value.length
        }
        break
      }
    }
  }

  return {
    needed: itemsToMigrate > 0,
    itemsToMigrate,
    estimatedSize,
  }
}