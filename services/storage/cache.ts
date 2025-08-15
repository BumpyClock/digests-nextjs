/**
 * Caching implementation for storing data with TTL
 */

import { Logger } from "@/utils/logger";

/**
 * Cache item with metadata
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * In-memory cache with TTL support
 */
export class MemoryCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private readonly LOG_CONTEXT = "MemoryCache";

  /**
   * Sets a cache item with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in milliseconds
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const timestamp = Date.now();
    const expiresAt = ttl ? timestamp + ttl : undefined;

    this.cache.set(key, {
      data: value,
      timestamp,
      expiresAt,
    });

    Logger.debug(`Cache set: ${key}`, this.LOG_CONTEXT, { ttl });
  }

  /**
   * Gets a cache item if it exists and hasn't expired
   * @param key - Cache key
   * @returns The cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      Logger.debug(`Cache miss: ${key}`, this.LOG_CONTEXT);
      return null;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      Logger.debug(`Cache expired: ${key}`, this.LOG_CONTEXT);
      this.delete(key);
      return null;
    }

    Logger.debug(`Cache hit: ${key}`, this.LOG_CONTEXT);
    return item.data as T;
  }

  /**
   * Deletes a cache item
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
    Logger.debug(`Cache deleted: ${key}`, this.LOG_CONTEXT);
  }

  /**
   * Clears all cache items
   */
  clear(): void {
    this.cache.clear();
    Logger.debug("Cache cleared", this.LOG_CONTEXT);
  }

  /**
   * Checks if a key exists and is valid
   * @param key - Cache key
   */
  has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Gets all valid keys in the cache
   */
  keys(): string[] {
    const validKeys: string[] = [];

    this.cache.forEach((item, key) => {
      if (!item.expiresAt || item.expiresAt >= Date.now()) {
        validKeys.push(key);
      }
    });

    return validKeys;
  }
}

export const memoryCache = new MemoryCache();
