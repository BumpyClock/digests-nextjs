/**
 * Storage service for persistent data
 */

import { 
  StorageProvider, 
  StorageItem, 
  StorageKeys, 
  StorageConfig, 
  FeedStorage, 
  FeedItemStorage 
} from '@/types/storage'
import { Feed, FeedItem } from '@/types/feed'
import { StorageError } from '@/types/errors'
import { Logger } from '@/utils/logger'
import { Result } from '@/types'
import { memoryCache } from './cache'

/**
 * Default storage configuration
 */
const defaultConfig: StorageConfig = {
  prefix: 'digests',
  version: '1',
  ttl: 24 * 60 * 60 * 1000 // 24 hours
}

/**
 * Default storage keys
 */
const STORAGE_KEYS: StorageKeys = {
  FEEDS: 'digests-feeds',
  FEED_ITEMS: 'digests-items',
  SETTINGS: 'digests-settings',
  FAVORITES: 'digests-favorites'
}

/**
 * Local storage provider implementation
 */
class LocalStorageProvider implements StorageProvider {
  private readonly LOG_CONTEXT = 'LocalStorageProvider'
  
  /**
   * Gets an item from storage
   * @param key - Storage key
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const cached = memoryCache.get<T>(key)
      if (cached !== null) {
        return cached
      }
      
      const item = localStorage.getItem(key)
      if (!item) {
        return null
      }
      
      const parsed = JSON.parse(item) as T
      
      // Store in memory cache for faster access next time
      memoryCache.set(key, parsed)
      
      return parsed
    } catch (error) {
      Logger.error(`Error getting item from storage: ${key}`, error as Error, this.LOG_CONTEXT)
      return null
    }
  }
  
  /**
   * Sets an item in storage
   * @param key - Storage key
   * @param value - Value to store
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
      
      // Update memory cache
      memoryCache.set(key, value)
      
      Logger.debug(`Item set in storage: ${key}`, this.LOG_CONTEXT)
    } catch (error) {
      Logger.error(`Error setting item in storage: ${key}`, error as Error, this.LOG_CONTEXT)
      throw new StorageError(`Failed to set item in storage: ${key}`)
    }
  }
  
  /**
   * Removes an item from storage
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
      
      // Remove from memory cache
      memoryCache.delete(key)
      
      Logger.debug(`Item removed from storage: ${key}`, this.LOG_CONTEXT)
    } catch (error) {
      Logger.error(`Error removing item from storage: ${key}`, error as Error, this.LOG_CONTEXT)
      throw new StorageError(`Failed to remove item from storage: ${key}`)
    }
  }
  
  /**
   * Clears all storage
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear()
      
      // Clear memory cache
      memoryCache.clear()
      
      Logger.debug('Storage cleared', this.LOG_CONTEXT)
    } catch (error) {
      Logger.error('Error clearing storage', error as Error, this.LOG_CONTEXT)
      throw new StorageError('Failed to clear storage')
    }
  }
}

/**
 * Storage service for managing persistent data
 */
export class StorageService {
  private static instance: StorageService
  private provider: StorageProvider
  private config: StorageConfig
  private readonly LOG_CONTEXT = 'StorageService'
  
  /**
   * Creates a storage service
   * @param provider - Storage provider to use
   * @param config - Storage configuration
   */
  private constructor(provider: StorageProvider, config: StorageConfig = defaultConfig) {
    this.provider = provider
    this.config = config
  }
  
  /**
   * Gets the singleton instance
   */
  static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService(new LocalStorageProvider())
    }
    return this.instance
  }
  
  /**
   * Gets all feeds from storage
   */
  async getFeeds(): Promise<Result<Feed[]>> {
    try {
      const storage = await this.provider.getItem<FeedStorage>(STORAGE_KEYS.FEEDS)
      
      if (!storage) {
        return { success: true, data: [] }
      }
      
      return { success: true, data: storage.feeds }
    } catch (error) {
      Logger.error('Error getting feeds from storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to get feeds from storage')
      }
    }
  }
  
  /**
   * Saves feeds to storage
   * @param feeds - Feeds to save
   */
  async saveFeeds(feeds: Feed[]): Promise<Result<void>> {
    try {
      const storage: FeedStorage = {
        feeds,
        lastUpdated: Date.now()
      }
      
      await this.provider.setItem(STORAGE_KEYS.FEEDS, storage)
      return { success: true }
    } catch (error) {
      Logger.error('Error saving feeds to storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to save feeds to storage')
      }
    }
  }
  
  /**
   * Gets all feed items from storage
   */
  async getFeedItems(): Promise<Result<FeedItem[]>> {
    try {
      const storage = await this.provider.getItem<FeedItemStorage>(STORAGE_KEYS.FEED_ITEMS)
      
      if (!storage) {
        return { success: true, data: [] }
      }
      
      return { success: true, data: storage.items }
    } catch (error) {
      Logger.error('Error getting feed items from storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to get feed items from storage')
      }
    }
  }
  
  /**
   * Saves feed items to storage
   * @param items - Feed items to save
   */
  async saveFeedItems(items: FeedItem[]): Promise<Result<void>> {
    try {
      const storage: FeedItemStorage = {
        items,
        lastUpdated: Date.now()
      }
      
      await this.provider.setItem(STORAGE_KEYS.FEED_ITEMS, storage)
      return { success: true }
    } catch (error) {
      Logger.error('Error saving feed items to storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to save feed items to storage')
      }
    }
  }
  
  /**
   * Adds a single feed to storage
   * @param feed - Feed to add
   */
  async addFeed(feed: Feed): Promise<Result<void>> {
    try {
      const feedsResult = await this.getFeeds()
      
      if (!feedsResult.success) {
        return feedsResult
      }
      
      const feeds = feedsResult.data
      
      // Check if feed already exists
      const exists = feeds.some(f => f.feedUrl === feed.feedUrl)
      
      if (!exists) {
        feeds.push(feed)
        return this.saveFeeds(feeds)
      }
      
      return { success: true }
    } catch (error) {
      Logger.error('Error adding feed to storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to add feed to storage')
      }
    }
  }
  
  /**
   * Removes a feed from storage
   * @param feedUrl - URL of the feed to remove
   */
  async removeFeed(feedUrl: string): Promise<Result<void>> {
    try {
      const feedsResult = await this.getFeeds()
      
      if (!feedsResult.success) {
        return feedsResult
      }
      
      const feeds = feedsResult.data.filter(f => f.feedUrl !== feedUrl)
      
      // Save updated feeds
      const saveResult = await this.saveFeeds(feeds)
      
      if (!saveResult.success) {
        return saveResult
      }
      
      // Also remove feed items
      const itemsResult = await this.getFeedItems()
      
      if (!itemsResult.success) {
        return itemsResult
      }
      
      const items = itemsResult.data.filter(item => item.feedUrl !== feedUrl)
      
      return this.saveFeedItems(items)
    } catch (error) {
      Logger.error('Error removing feed from storage', error as Error, this.LOG_CONTEXT)
      return {
        success: false,
        error: error instanceof Error ? error : new StorageError('Failed to remove feed from storage')
      }
    }
  }
}

export const storageService = StorageService.getInstance() 