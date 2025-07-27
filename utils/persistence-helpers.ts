// ABOUTME: Utility functions for handling offline data persistence and sync
// ABOUTME: Provides helper functions for feed data storage, conflict resolution, and migration

import type { Feed, FeedItem } from '@/types'
import { Logger } from '@/utils/logger'

/**
 * Persistence key constants
 */
export const PERSISTENCE_KEYS = {
  FEEDS: 'digests_feeds',
  FEED_ITEMS: 'digests_feed_items',
  READ_STATUS: 'digests_read_status',
  SYNC_QUEUE: 'digests_sync_queue',
  LAST_SYNC: 'digests_last_sync',
  OFFLINE_CHANGES: 'digests_offline_changes',
} as const

/**
 * Data structure for persisted feeds
 */
export interface PersistedFeedData {
  feeds: Feed[]
  items: FeedItem[]
  lastFetched: number
  version: number
  readItems: string[]
  metadata: {
    totalFeeds: number
    totalItems: number
    lastUpdated: string
    syncStatus: 'synced' | 'pending' | 'conflicted'
  }
}

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy = 
  | 'local-wins'
  | 'remote-wins' 
  | 'merge-by-timestamp'
  | 'user-choice'

/**
 * Merge feed data with conflict resolution
 */
export function mergeFeedData(
  localData: PersistedFeedData,
  remoteData: Partial<PersistedFeedData>,
  strategy: ConflictResolutionStrategy = 'merge-by-timestamp'
): PersistedFeedData {
  Logger.debug('[PersistenceHelpers] Merging feed data with strategy:', strategy)

  switch (strategy) {
    case 'local-wins':
      return {
        ...localData,
        metadata: {
          ...localData.metadata,
          syncStatus: 'synced',
          lastUpdated: new Date().toISOString(),
        }
      }

    case 'remote-wins':
      return {
        ...remoteData,
        metadata: {
          ...remoteData.metadata,
          syncStatus: 'synced',
          lastUpdated: new Date().toISOString(),
        }
      } as PersistedFeedData

    case 'merge-by-timestamp':
      return mergeByTimestamp(localData, remoteData)

    case 'user-choice':
      // This would typically show a UI for user selection
      // For now, fall back to timestamp merge
      return mergeByTimestamp(localData, remoteData)

    default:
      Logger.warn('[PersistenceHelpers] Unknown strategy, using merge-by-timestamp')
      return mergeByTimestamp(localData, remoteData)
  }
}

/**
 * Merge data by timestamp (most recent wins)
 */
function mergeByTimestamp(
  localData: PersistedFeedData,
  remoteData: Partial<PersistedFeedData>
): PersistedFeedData {
  // Use remote data if it's newer, otherwise keep local
  const useRemote = (remoteData.lastFetched || 0) > localData.lastFetched

  if (useRemote && remoteData.feeds && remoteData.items) {
    return {
      feeds: remoteData.feeds,
      items: remoteData.items,
      lastFetched: remoteData.lastFetched || Date.now(),
      version: Math.max(localData.version, remoteData.version || 0) + 1,
      readItems: mergeReadItems(localData.readItems, remoteData.readItems || []),
      metadata: {
        totalFeeds: remoteData.feeds.length,
        totalItems: remoteData.items.length,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'synced',
      }
    }
  }

  // Keep local data but update sync status
  return {
    ...localData,
    version: localData.version + 1,
    metadata: {
      ...localData.metadata,
      syncStatus: 'synced',
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * Merge read items (union of both sets)
 */
function mergeReadItems(local: string[], remote: string[]): string[] {
  const merged = new Set([...local, ...remote])
  return Array.from(merged)
}

/**
 * Validate feed data structure
 */
export function validateFeedData(data: any): data is PersistedFeedData {
  if (!data || typeof data !== 'object') return false

  const required = ['feeds', 'items', 'lastFetched', 'version', 'readItems', 'metadata']
  const hasRequired = required.every(key => key in data)

  if (!hasRequired) {
    Logger.warn('[PersistenceHelpers] Missing required keys in feed data')
    return false
  }

  if (!Array.isArray(data.feeds) || !Array.isArray(data.items) || !Array.isArray(data.readItems)) {
    Logger.warn('[PersistenceHelpers] Invalid array types in feed data')
    return false
  }

  if (typeof data.lastFetched !== 'number' || typeof data.version !== 'number') {
    Logger.warn('[PersistenceHelpers] Invalid number types in feed data')
    return false
  }

  return true
}

/**
 * Migrate data between versions
 */
export function migrateData(data: any, fromVersion: number, toVersion: number): PersistedFeedData {
  Logger.debug('[PersistenceHelpers] Migrating data from version', fromVersion, 'to', toVersion)

  let migrated = { ...data }

  // Migration v1 -> v2: Add metadata structure
  if (fromVersion < 2) {
    migrated.metadata = {
      totalFeeds: migrated.feeds?.length || 0,
      totalItems: migrated.items?.length || 0,
      lastUpdated: new Date().toISOString(),
      syncStatus: 'synced',
    }
    migrated.version = 2
  }

  // Migration v2 -> v3: Ensure readItems is array
  if (fromVersion < 3) {
    if (!Array.isArray(migrated.readItems)) {
      migrated.readItems = []
    }
    migrated.version = 3
  }

  // Future migrations can be added here

  migrated.version = toVersion
  return migrated as PersistedFeedData
}

/**
 * Create default/empty feed data structure
 */
export function createEmptyFeedData(): PersistedFeedData {
  return {
    feeds: [],
    items: [],
    lastFetched: 0,
    version: 3, // Current version
    readItems: [],
    metadata: {
      totalFeeds: 0,
      totalItems: 0,
      lastUpdated: new Date().toISOString(),
      syncStatus: 'synced',
    }
  }
}

/**
 * Calculate data size for storage optimization
 */
export function calculateDataSize(data: PersistedFeedData): number {
  try {
    const jsonString = JSON.stringify(data)
    return new Blob([jsonString]).size
  } catch (error) {
    Logger.error('[PersistenceHelpers] Failed to calculate data size:', error)
    return 0
  }
}

/**
 * Compress data for storage (simple string compression)
 */
export function compressData(data: PersistedFeedData): string {
  try {
    // Simple compression by removing unnecessary whitespace
    return JSON.stringify(data)
  } catch (error) {
    Logger.error('[PersistenceHelpers] Failed to compress data:', error)
    return JSON.stringify(createEmptyFeedData())
  }
}

/**
 * Decompress data from storage
 */
export function decompressData(compressed: string): PersistedFeedData {
  try {
    const data = JSON.parse(compressed)
    
    if (!validateFeedData(data)) {
      Logger.warn('[PersistenceHelpers] Invalid data structure, using empty data')
      return createEmptyFeedData()
    }

    // Check if migration is needed
    const currentVersion = 3
    if (data.version < currentVersion) {
      return migrateData(data, data.version, currentVersion)
    }

    return data
  } catch (error) {
    Logger.error('[PersistenceHelpers] Failed to decompress data:', error)
    return createEmptyFeedData()
  }
}

/**
 * Clean up old items to prevent storage bloat
 */
export function cleanupOldItems(
  data: PersistedFeedData, 
  maxItems: number = 1000,
  maxAgeDays: number = 30
): PersistedFeedData {
  const cutoffDate = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000)
  
  // Filter items by age and limit total count
  const recentItems = data.items
    .filter(item => {
      const itemDate = new Date(item.published || item.pubDate || 0).getTime()
      return itemDate > cutoffDate
    })
    .sort((a, b) => {
      const dateA = new Date(a.published || a.pubDate || 0).getTime()
      const dateB = new Date(b.published || b.pubDate || 0).getTime()
      return dateB - dateA // Most recent first
    })
    .slice(0, maxItems)

  // Clean up read items that no longer exist
  const existingItemIds = new Set(recentItems.map(item => item.id))
  const cleanedReadItems = data.readItems.filter(id => existingItemIds.has(id))

  Logger.debug('[PersistenceHelpers] Cleaned up items:', {
    before: data.items.length,
    after: recentItems.length,
    readItemsBefore: data.readItems.length,
    readItemsAfter: cleanedReadItems.length,
  })

  return {
    ...data,
    items: recentItems,
    readItems: cleanedReadItems,
    metadata: {
      ...data.metadata,
      totalItems: recentItems.length,
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * Generate cache key for data persistence
 */
export function generateCacheKey(prefix: string, identifier: string): string {
  // Simple cache key generation
  const sanitized = identifier.replace(/[^a-zA-Z0-9]/g, '_')
  return `${prefix}_${sanitized}`
}

/**
 * Check if data needs refresh based on TTL
 */
export function isDataStale(lastFetched: number, ttl: number = 30 * 60 * 1000): boolean {
  return Date.now() - lastFetched > ttl
}

/**
 * Utilities for debugging persistence issues
 */
export const debugUtils = {
  logDataStructure: (data: PersistedFeedData) => {
    Logger.debug('[PersistenceHelpers] Data structure:', {
      feedCount: data.feeds.length,
      itemCount: data.items.length,
      readItemCount: data.readItems.length,
      lastFetched: new Date(data.lastFetched).toISOString(),
      version: data.version,
      dataSize: calculateDataSize(data),
    })
  },

  validateIntegrity: (data: PersistedFeedData): boolean => {
    const feedUrls = new Set(data.feeds.map(f => f.feedUrl))
    const itemFeedUrls = new Set(data.items.map(i => i.feedUrl))
    
    // Check if all items belong to existing feeds
    const orphanedItems = Array.from(itemFeedUrls).filter(url => !feedUrls.has(url))
    
    if (orphanedItems.length > 0) {
      Logger.warn('[PersistenceHelpers] Found orphaned items for feeds:', orphanedItems)
      return false
    }

    // Check if read items exist
    const itemIds = new Set(data.items.map(i => i.id))
    const orphanedReadItems = data.readItems.filter(id => !itemIds.has(id))
    
    if (orphanedReadItems.length > 0) {
      Logger.warn('[PersistenceHelpers] Found orphaned read items:', orphanedReadItems.length)
      return false
    }

    return true
  }
}