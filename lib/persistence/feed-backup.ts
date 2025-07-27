/**
 * Feed state backup service for migration from Zustand to React Query
 * Provides data backup, validation, and rollback capabilities for feed data
 */

import { IndexedDBAdapter } from './indexdb-adapter'
import { PersistenceError, PersistenceErrorType } from '@/types/persistence'
import { Logger } from '@/utils/logger'
import type { Feed, FeedItem } from '@/types'

// Backup keys for feed data
const FEED_BACKUP_KEYS = {
  FEED_STATE: 'backup:feeds:feed-state',
  FEED_ITEMS: 'backup:feeds:feed-items',
  READ_STATUS: 'backup:feeds:read-status',
  METADATA: 'backup:feeds:metadata',
  MIGRATION_STATUS: 'backup:feeds:migration-status',
  ROLLBACK_DATA: 'backup:feeds:rollback',
} as const

/**
 * Feed migration status tracking
 */
export interface FeedMigrationStatus {
  /** Migration phase */
  phase: 'not-started' | 'in-progress' | 'completed' | 'failed' | 'rolled-back'
  
  /** Timestamp when migration started */
  startedAt?: number
  
  /** Timestamp when migration completed */
  completedAt?: number
  
  /** Migration progress (0-1) */
  progress: number
  
  /** Current step being executed */
  currentStep?: string
  
  /** Error message if migration failed */
  error?: string
  
  /** Number of retry attempts */
  retryCount: number
  
  /** Whether auto-rollback is enabled */
  autoRollback: boolean
  
  /** Backup created timestamp */
  backupCreatedAt?: number
  
  /** Whether rollback is available */
  canRollback: boolean
  
  /** Statistics about the migration */
  stats: {
    totalFeeds: number
    totalItems: number
    migratedFeeds: number
    migratedItems: number
    failedFeeds: number
    failedItems: number
  }
}

/**
 * Feed backup data structure
 */
export interface FeedBackupData {
  /** Zustand feed store state */
  zustandState: {
    feeds: Feed[]
    feedItems: FeedItem[]
    readItems: string[]
    readLaterItems: string[]
    activeFeed: string | null
    initialized: boolean
    lastRefresh?: number
  }
  
  /** Browser storage data */
  localStorage: Record<string, string>
  
  /** Session storage data */
  sessionStorage: Record<string, string>
  
  /** Metadata about the backup */
  metadata: {
    timestamp: number
    version: string
    userAgent: string
    url: string
    feedCount: number
    itemCount: number
    zustandVersion?: string
    reactQueryVersion?: string
  }
  
  /** Validation checksum */
  checksum: string
}

/**
 * Feed state interface for Zustand store
 */
interface FeedStoreState {
  feeds: Feed[]
  feedItems: FeedItem[]
  readItems: Set<string>
  readLaterItems: Set<string>
  activeFeed: string | null
  initialized: boolean
  lastRefresh?: number
}

/**
 * Feed backup service for migration safety
 */
export class FeedBackupService {
  private adapter: IndexedDBAdapter
  private isInitialized = false

  constructor() {
    this.adapter = new IndexedDBAdapter({
      name: 'digests-feed-backup',
      version: 1,
      storageOptions: {
        stores: ['feed-backup', 'migration-status'],
      },
    })
  }

  /**
   * Initialize the backup service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Test adapter functionality
      await this.adapter.get('test')
      this.isInitialized = true
      Logger.debug('[FeedBackupService] Initialized successfully')
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to initialize:', error)
      throw new PersistenceError(
        PersistenceErrorType.STORAGE_UNAVAILABLE,
        'Feed backup service initialization failed',
        error
      )
    }
  }

  /**
   * Create a comprehensive backup of feed state before migration
   */
  async createBackup(zustandState: FeedStoreState): Promise<string> {
    await this.initialize()

    Logger.debug('[FeedBackupService] Creating feed state backup')

    try {
      // Convert Sets to arrays for serialization
      const backupData: FeedBackupData = {
        zustandState: {
          feeds: zustandState.feeds,
          feedItems: zustandState.feedItems,
          readItems: Array.from(zustandState.readItems),
          readLaterItems: Array.from(zustandState.readLaterItems),
          activeFeed: zustandState.activeFeed,
          initialized: zustandState.initialized,
          lastRefresh: zustandState.lastRefresh,
        },
        localStorage: this.extractFeedFromStorage('localStorage'),
        sessionStorage: this.extractFeedFromStorage('sessionStorage'),
        metadata: {
          timestamp: Date.now(),
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          feedCount: zustandState.feeds.length,
          itemCount: zustandState.feedItems.length,
        },
        checksum: '',
      }

      // Generate checksum for data integrity
      backupData.checksum = await this.generateChecksum(backupData)

      // Store backup
      const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await this.adapter.set(FEED_BACKUP_KEYS.FEED_STATE, backupData)
      await this.adapter.set(`${FEED_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`, backupData)

      // Update migration status
      const migrationStatus: FeedMigrationStatus = {
        phase: 'not-started',
        progress: 0,
        retryCount: 0,
        autoRollback: true,
        backupCreatedAt: Date.now(),
        canRollback: true,
        stats: {
          totalFeeds: zustandState.feeds.length,
          totalItems: zustandState.feedItems.length,
          migratedFeeds: 0,
          migratedItems: 0,
          failedFeeds: 0,
          failedItems: 0,
        },
      }

      await this.adapter.set(FEED_BACKUP_KEYS.MIGRATION_STATUS, migrationStatus)

      Logger.debug('[FeedBackupService] Backup created successfully:', backupId)
      return backupId
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to create backup:', error)
      throw new PersistenceError(
        PersistenceErrorType.SERIALIZATION_FAILED,
        'Failed to create feed state backup',
        error
      )
    }
  }

  /**
   * Validate backup data integrity
   */
  async validateBackup(backupId?: string): Promise<boolean> {
    await this.initialize()

    try {
      const backupData = backupId
        ? await this.adapter.get<FeedBackupData>(`${FEED_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`)
        : await this.adapter.get<FeedBackupData>(FEED_BACKUP_KEYS.FEED_STATE)

      if (!backupData) {
        Logger.warn('[FeedBackupService] No backup data found')
        return false
      }

      // Basic structure validation
      if (!backupData.zustandState || !Array.isArray(backupData.zustandState.feeds)) {
        Logger.error('[FeedBackupService] Invalid backup structure')
        return false
      }

      // Verify checksum
      const currentChecksum = await this.generateChecksum({
        ...backupData,
        checksum: '',
      })

      const isValid = currentChecksum === backupData.checksum

      if (!isValid) {
        Logger.error('[FeedBackupService] Backup data corruption detected')
      }

      return isValid
    } catch (error) {
      Logger.error('[FeedBackupService] Backup validation failed:', error)
      return false
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<FeedMigrationStatus | null> {
    await this.initialize()

    try {
      return await this.adapter.get<FeedMigrationStatus>(FEED_BACKUP_KEYS.MIGRATION_STATUS)
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to get migration status:', error)
      return null
    }
  }

  /**
   * Update migration status
   */
  async updateMigrationStatus(
    updates: Partial<FeedMigrationStatus>
  ): Promise<void> {
    await this.initialize()

    try {
      const current = await this.getMigrationStatus() || {
        phase: 'not-started' as const,
        progress: 0,
        retryCount: 0,
        autoRollback: true,
        canRollback: false,
        stats: {
          totalFeeds: 0,
          totalItems: 0,
          migratedFeeds: 0,
          migratedItems: 0,
          failedFeeds: 0,
          failedItems: 0,
        },
      }

      const updated: FeedMigrationStatus = {
        ...current,
        ...updates,
        stats: {
          ...current.stats,
          ...(updates.stats || {}),
        },
      }

      await this.adapter.set(FEED_BACKUP_KEYS.MIGRATION_STATUS, updated)
      Logger.debug('[FeedBackupService] Migration status updated:', updated.phase)
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to update migration status:', error)
      throw error
    }
  }

  /**
   * Restore feed state from backup (rollback)
   */
  async rollbackToBackup(backupId?: string): Promise<FeedBackupData> {
    await this.initialize()

    Logger.warn('[FeedBackupService] Rolling back feed state from backup')

    try {
      // Validate backup first
      const isValid = await this.validateBackup(backupId)
      if (!isValid) {
        throw new Error('Backup data is corrupted or invalid')
      }

      const backupData = backupId
        ? await this.adapter.get<FeedBackupData>(`${FEED_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`)
        : await this.adapter.get<FeedBackupData>(FEED_BACKUP_KEYS.FEED_STATE)

      if (!backupData) {
        throw new Error('No backup data found')
      }

      // Restore browser storage
      this.restoreStorageData('localStorage', backupData.localStorage)
      this.restoreStorageData('sessionStorage', backupData.sessionStorage)

      // Update migration status
      await this.updateMigrationStatus({
        phase: 'rolled-back',
        completedAt: Date.now(),
        progress: 0,
        currentStep: 'Rollback completed',
      })

      Logger.debug('[FeedBackupService] Rollback completed successfully')
      return backupData
    } catch (error) {
      Logger.error('[FeedBackupService] Rollback failed:', error)
      
      await this.updateMigrationStatus({
        phase: 'failed',
        error: `Rollback failed: ${error.message}`,
      })

      throw new PersistenceError(
        PersistenceErrorType.CORRUPTION,
        'Failed to rollback feed state',
        error
      )
    }
  }

  /**
   * Clear all backup data (after successful migration)
   */
  async clearBackups(): Promise<void> {
    await this.initialize()

    try {
      await this.adapter.delete(FEED_BACKUP_KEYS.FEED_STATE)
      
      // Update migration status
      await this.updateMigrationStatus({
        phase: 'completed',
        completedAt: Date.now(),
        progress: 1,
        canRollback: false,
        currentStep: 'Migration completed, backups cleared',
      })

      Logger.debug('[FeedBackupService] Backup data cleared')
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to clear backups:', error)
      throw error
    }
  }

  /**
   * Get backup storage info
   */
  async getBackupInfo(): Promise<{
    hasBackup: boolean
    backupAge?: number
    feedCount?: number
    itemCount?: number
    migrationStatus?: FeedMigrationStatus
  }> {
    await this.initialize()

    try {
      const backupData = await this.adapter.get<FeedBackupData>(FEED_BACKUP_KEYS.FEED_STATE)
      const migrationStatus = await this.getMigrationStatus()

      if (!backupData) {
        return { hasBackup: false, migrationStatus }
      }

      const backupAge = Date.now() - backupData.metadata.timestamp

      return {
        hasBackup: true,
        backupAge,
        feedCount: backupData.metadata.feedCount,
        itemCount: backupData.metadata.itemCount,
        migrationStatus,
      }
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to get backup info:', error)
      return { hasBackup: false }
    }
  }

  /**
   * Backup specific feed data during partial migration
   */
  async backupFeedData(feeds: Feed[], items: FeedItem[]): Promise<void> {
    await this.initialize()

    try {
      const partialBackup = {
        feeds,
        items,
        timestamp: Date.now(),
      }

      await this.adapter.set(
        `${FEED_BACKUP_KEYS.FEED_STATE}:partial:${Date.now()}`,
        partialBackup
      )

      Logger.debug('[FeedBackupService] Partial feed data backed up')
    } catch (error) {
      Logger.error('[FeedBackupService] Failed to backup partial feed data:', error)
      throw error
    }
  }

  /**
   * Extract feed-related data from browser storage
   */
  private extractFeedFromStorage(storageType: 'localStorage' | 'sessionStorage'): Record<string, string> {
    if (typeof window === 'undefined') return {}

    const storage = window[storageType]
    const feedData: Record<string, string> = {}

    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && this.isFeedRelatedKey(key)) {
          const value = storage.getItem(key)
          if (value) {
            feedData[key] = value
          }
        }
      }
    } catch (error) {
      Logger.warn(`[FeedBackupService] Failed to extract from ${storageType}:`, error)
    }

    return feedData
  }

  /**
   * Check if a storage key is feed-related
   */
  private isFeedRelatedKey(key: string): boolean {
    const feedKeyPatterns = [
      /^feed/,
      /^rss/,
      /^digest/,
      /digests.*feed/,
      /zustand.*feed/,
      /react-query.*feed/,
      /^read/,
      /^article/,
    ]

    return feedKeyPatterns.some(pattern => pattern.test(key))
  }

  /**
   * Restore data to browser storage
   */
  private restoreStorageData(
    storageType: 'localStorage' | 'sessionStorage',
    data: Record<string, string>
  ): void {
    if (typeof window === 'undefined') return

    const storage = window[storageType]

    try {
      // Clear existing feed data first
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && this.isFeedRelatedKey(key)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key))

      // Restore backup data
      Object.entries(data).forEach(([key, value]) => {
        storage.setItem(key, value)
      })

      Logger.debug(`[FeedBackupService] Restored ${Object.keys(data).length} items to ${storageType}`)
    } catch (error) {
      Logger.error(`[FeedBackupService] Failed to restore to ${storageType}:`, error)
      throw error
    }
  }

  /**
   * Generate checksum for data integrity verification
   */
  private async generateChecksum(data: Omit<FeedBackupData, 'checksum'>): Promise<string> {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(dataString)
    
    if (typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      // Fallback for environments without crypto.subtle
      let hash = 0
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return hash.toString(16)
    }
  }

  /**
   * Auto-rollback on migration failure
   */
  async attemptAutoRollback(): Promise<boolean> {
    try {
      const status = await this.getMigrationStatus()
      
      if (!status?.autoRollback || !status.canRollback) {
        Logger.warn('[FeedBackupService] Auto-rollback not available')
        return false
      }

      if (status.phase === 'failed' && status.retryCount < 3) {
        Logger.info('[FeedBackupService] Attempting auto-rollback')
        await this.rollbackToBackup()
        return true
      }

      return false
    } catch (error) {
      Logger.error('[FeedBackupService] Auto-rollback failed:', error)
      return false
    }
  }

  /**
   * Compare states to detect data inconsistencies
   */
  async compareStates(
    zustandState: FeedStoreState,
    reactQueryState: { feeds: Feed[]; items: FeedItem[] }
  ): Promise<{
    feedsDiff: { missing: Feed[]; extra: Feed[]; modified: Feed[] }
    itemsDiff: { missing: FeedItem[]; extra: FeedItem[]; modified: FeedItem[] }
    isConsistent: boolean
  }> {
    const feedsDiff = this.compareFeedArrays(zustandState.feeds, reactQueryState.feeds)
    const itemsDiff = this.compareItemArrays(zustandState.feedItems, reactQueryState.items)

    const isConsistent = 
      feedsDiff.missing.length === 0 &&
      feedsDiff.extra.length === 0 &&
      feedsDiff.modified.length === 0 &&
      itemsDiff.missing.length === 0 &&
      itemsDiff.extra.length === 0 &&
      itemsDiff.modified.length === 0

    return { feedsDiff, itemsDiff, isConsistent }
  }

  private compareFeedArrays(feeds1: Feed[], feeds2: Feed[]): {
    missing: Feed[]
    extra: Feed[]
    modified: Feed[]
  } {
    const feeds1Map = new Map(feeds1.map(f => [f.feedUrl, f]))
    const feeds2Map = new Map(feeds2.map(f => [f.feedUrl, f]))

    const missing = feeds1.filter(f => !feeds2Map.has(f.feedUrl))
    const extra = feeds2.filter(f => !feeds1Map.has(f.feedUrl))
    const modified: Feed[] = []

    // Check for modifications
    for (const [url, feed1] of feeds1Map) {
      const feed2 = feeds2Map.get(url)
      if (feed2 && JSON.stringify(feed1) !== JSON.stringify(feed2)) {
        modified.push(feed1)
      }
    }

    return { missing, extra, modified }
  }

  private compareItemArrays(items1: FeedItem[], items2: FeedItem[]): {
    missing: FeedItem[]
    extra: FeedItem[]
    modified: FeedItem[]
  } {
    const items1Map = new Map(items1.map(i => [i.id, i]))
    const items2Map = new Map(items2.map(i => [i.id, i]))

    const missing = items1.filter(i => !items2Map.has(i.id))
    const extra = items2.filter(i => !items1Map.has(i.id))
    const modified: FeedItem[] = []

    // Check for modifications
    for (const [id, item1] of items1Map) {
      const item2 = items2Map.get(id)
      if (item2 && JSON.stringify(item1) !== JSON.stringify(item2)) {
        modified.push(item1)
      }
    }

    return { missing, extra, modified }
  }
}

// Singleton instance
export const feedBackupService = new FeedBackupService()