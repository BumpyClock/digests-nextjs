/**
 * IndexedDB implementation of the PersistenceAdapter interface
 * Provides offline storage for React Query cache with TTL support
 */

import type {
  PersistenceAdapter,
  StorageInfo,
  PersistedQueryData,
} from "@/types/persistence";
import { PersistenceError, PersistenceErrorType } from "@/types/persistence";

const DB_NAME = "digests-offline-cache";
const DB_VERSION = 1;
const STORE_NAME = "query-cache";

/**
 * IndexedDB adapter for React Query persistence
 * Handles browser storage with automatic cleanup and TTL support
 */
export class IndexedDBAdapter implements PersistenceAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private maxStoragePercent = 80; // Start cleanup at 80% usage

  constructor(
    private dbName = DB_NAME,
    private storeName = STORE_NAME,
    private version = DB_VERSION,
  ) {
    // Start automatic cleanup when adapter is created
    this.startAutomaticCleanup();
  }

  /**
   * Initialize the database connection
   */
  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.openDatabase();
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw this.handleError(error, PersistenceErrorType.STORAGE_UNAVAILABLE);
    }
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        const error = this.handleError(
          request.error,
          PersistenceErrorType.STORAGE_UNAVAILABLE,
        );
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "key",
          });

          // Create indexes for efficient queries
          store.createIndex("expiresAt", "expiresAt", { unique: false });
          store.createIndex("dataUpdatedAt", "dataUpdatedAt", {
            unique: false,
          });
          store.createIndex("queryType", "meta.queryType", { unique: false });
        }
      };
    });
  }

  /**
   * Get a value by key
   */
  async get<T>(key: string): Promise<T | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as PersistedQueryData<T> | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (result.expiresAt && Date.now() > result.expiresAt) {
          // Clean up expired entry
          this.delete(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => {
        const error = this.handleError(
          request.error,
          PersistenceErrorType.STORAGE_UNAVAILABLE,
        );
        reject(error);
      };
    });
  }

  /**
   * Store a value with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.init();

    const entry: PersistedQueryData<T> = {
      key,
      data: value,
      dataUpdatedAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();

      request.onerror = () => {
        if (request.error?.name === "QuotaExceededError") {
          // Try to clean up and retry
          this.performCleanup()
            .then(() => this.set(key, value, ttl))
            .then(resolve)
            .catch((cleanupError) => {
              const error = this.handleError(
                cleanupError,
                PersistenceErrorType.QUOTA_EXCEEDED,
              );
              reject(error);
            });
        } else {
          const error = this.handleError(
            request.error,
            PersistenceErrorType.STORAGE_UNAVAILABLE,
          );
          reject(error);
        }
      };
    });
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = this.handleError(
          request.error,
          PersistenceErrorType.STORAGE_UNAVAILABLE,
        );
        reject(error);
      };
    });
  }

  /**
   * Clear all stored values
   */
  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = this.handleError(
          request.error,
          PersistenceErrorType.STORAGE_UNAVAILABLE,
        );
        reject(error);
      };
    });
  }

  /**
   * Get multiple values at once
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    await this.init();

    return new Promise((resolve, reject) => {
      const results = new Map<string, T>();
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      let completed = 0;
      const total = keys.length;

      if (total === 0) {
        resolve(results);
        return;
      }

      keys.forEach((key) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as PersistedQueryData<T> | undefined;

          if (result && (!result.expiresAt || Date.now() <= result.expiresAt)) {
            results.set(key, result.data);
          }

          completed++;
          if (completed === total) {
            resolve(results);
          }
        };

        request.onerror = () => {
          completed++;
          console.error(`Failed to get key ${key}:`, request.error);

          if (completed === total) {
            resolve(results);
          }
        };
      });
    });
  }

  /**
   * Store multiple values at once
   */
  async setMany<T>(entries: Map<string, T>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      let completed = 0;
      const total = entries.size;

      if (total === 0) {
        resolve();
        return;
      }

      let hasError = false;

      entries.forEach((value, key) => {
        const entry: PersistedQueryData<T> = {
          key,
          data: value,
          dataUpdatedAt: Date.now(),
        };

        const request = store.put(entry);

        request.onsuccess = () => {
          completed++;
          if (completed === total && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          completed++;
          console.error(`Failed to set key ${key}:`, request.error);

          if (completed === total) {
            reject(new Error("Some entries failed to save"));
          }
        };
      });
    });
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.init();

    const estimate = await navigator.storage.estimate();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;

        // Get oldest entry
        const index = store.index("dataUpdatedAt");
        const request = index.openCursor(null, "next");

        request.onsuccess = () => {
          const cursor = request.result;
          const oldestEntry = cursor?.value?.dataUpdatedAt;

          resolve({
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
            count,
            oldestEntry,
          });
        };

        request.onerror = () => {
          reject(new Error("Failed to get oldest entry"));
        };
      };

      countRequest.onerror = () => {
        reject(new Error("Failed to get count"));
      };
    });
  }

  /**
   * Clean up expired entries and old data when space is needed
   */
  private async performCleanup(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("expiresAt");

      // Delete all expired entries
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          // Also remove oldest entries if still over quota
          this.removeOldestEntries(0.2) // Remove oldest 20%
            .then(() => resolve())
            .catch(reject);
        }
      };

      request.onerror = () => {
        reject(new Error("Failed to clean up expired entries"));
      };
    });
  }

  /**
   * Remove oldest entries by percentage
   */
  private async removeOldestEntries(percentage: number): Promise<void> {
    const info = await this.getStorageInfo();
    const toRemove = Math.floor(info.count * percentage);

    if (toRemove === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("dataUpdatedAt");
      const request = index.openCursor(null, "next");

      let removed = 0;

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor && removed < toRemove) {
          store.delete(cursor.primaryKey);
          removed++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error("Failed to remove oldest entries"));
      };
    });
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof window !== "undefined" && "indexedDB" in window;
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutomaticCleanup(): void {
    if (typeof window === "undefined" || this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      try {
        // Check storage health
        const health = await this.checkStorageHealth();

        // Clean up if needed
        if (
          health.percentage > this.maxStoragePercent ||
          health.hasExpiredItems
        ) {
          await this.performCleanup();
        }
      } catch (error) {
        console.error("Automatic cleanup failed:", error);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check storage health and identify cleanup needs
   */
  private async checkStorageHealth(): Promise<{
    percentage: number;
    hasExpiredItems: boolean;
  }> {
    const info = await this.getStorageInfo();
    const percentage = (info.used / info.quota) * 100;

    // Check for expired items
    const hasExpiredItems = await this.hasExpiredItems();

    return { percentage, hasExpiredItems };
  }

  /**
   * Check if there are expired items in the store
   */
  private async hasExpiredItems(): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const index = store.index("expiresAt");
        const range = IDBKeyRange.upperBound(Date.now());
        const request = index.count(range);

        request.onsuccess = () => {
          resolve(request.result > 0);
        };

        request.onerror = () => {
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Handle errors with proper error types
   */
  private handleError(
    error: unknown,
    type: PersistenceErrorType,
  ): PersistenceError {
    const message = error instanceof Error ? error.message : String(error);
    return new PersistenceError(type, message, error);
  }

  /**
   * Delete multiple keys at once (batch delete)
   */
  async deleteMany(keys: string[]): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      let completed = 0;
      let hasError = false;
      const total = keys.length;

      if (total === 0) {
        resolve();
        return;
      }

      keys.forEach((key) => {
        const request = store.delete(key);

        request.onsuccess = () => {
          completed++;
          if (completed === total && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          completed++;
          console.error(`Failed to delete key ${key}:`, request.error);

          if (completed === total) {
            reject(new Error("Some keys failed to delete"));
          }
        };
      });
    });
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const keys: string[] = [];
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor) {
          const key = cursor.value.key;

          // Filter by pattern if provided
          if (!pattern || key.includes(pattern)) {
            keys.push(key);
          }

          cursor.continue();
        } else {
          resolve(keys);
        }
      };

      request.onerror = () => {
        const error = this.handleError(
          request.error,
          PersistenceErrorType.STORAGE_UNAVAILABLE,
        );
        reject(error);
      };
    });
  }

  /**
   * Clean up expired entries and optimize storage
   */
  async cleanup(): Promise<void> {
    await this.performCleanup();
  }

  /**
   * Destroy the adapter and clean up resources
   */
  public async destroy(): Promise<void> {
    this.stopAutomaticCleanup();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initPromise = null;
  }
}
