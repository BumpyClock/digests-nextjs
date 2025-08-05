/**
 * IndexedDB adapter for persistence layer
 * Provides efficient browser-based storage with async operations
 */

import type {
  PersistenceAdapter,
  StorageInfo,
} from "@/types/persistence";
import { Logger } from "@/utils/logger";

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: string[];
  keyPath?: string;
}

export class IndexedDBAdapter implements PersistenceAdapter {
  private db: IDBDatabase | null = null;
  private config: IndexedDBConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: IndexedDBConfig) {
    this.config = {
      keyPath: "id",
      ...config,
    };
  }

  /**
   * Initialize the IndexedDB connection
   */
  private async initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this._initialize();
    }
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        const error = new Error("IndexedDB not supported");
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        const error = new Error(
          `Failed to open database: ${request.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        Logger.debug(
          `[IndexedDBAdapter] Database opened: ${this.config.dbName}`,
        );
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        for (const storeName of this.config.stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: this.config.keyPath,
            });

            // Create indexes for common query patterns
            store.createIndex("timestamp", "timestamp", { unique: false });
            store.createIndex("expiry", "expiresAt", { unique: false });

            Logger.debug(`[IndexedDBAdapter] Created store: ${storeName}`);
          }
        }
      };
    });
  }

  /**
   * Get a value by key
   */
  async get<T>(key: string): Promise<T | null> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readonly");
      const store = transaction.objectStore("persistence");
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiry
        if (result.expiresAt && Date.now() > result.expiresAt) {
          // Auto-cleanup expired entries
          this.delete(key).catch((err) =>
            Logger.warn(
              `[IndexedDBAdapter] Failed to cleanup expired key ${key}:`,
              err,
            ),
          );
          resolve(null);
          return;
        }

        resolve(result.value);
      };

      request.onerror = () => {
        const error = new Error(
          `Failed to get key ${key}: ${request.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };
    });
  }

  /**
   * Set a value with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const entry = {
      id: key,
      value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readwrite");
      const store = transaction.objectStore("persistence");
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = new Error(
          `Failed to set key ${key}: ${request.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };
    });
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readwrite");
      const store = transaction.objectStore("persistence");
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = new Error(
          `Failed to delete key ${key}: ${request.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };
    });
  }

  /**
   * Clear all stored values
   */
  async clear(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readwrite");
      const store = transaction.objectStore("persistence");
      const request = store.clear();

      request.onsuccess = () => {
        Logger.debug("[IndexedDBAdapter] All data cleared");
        resolve();
      };
      request.onerror = () => {
        const error = new Error(
          `Failed to clear data: ${request.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };
    });
  }

  /**
   * Get multiple values at once
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await this.get<T>(key);
          if (value !== null) {
            results.set(key, value);
          }
        } catch (error) {
          Logger.warn(`[IndexedDBAdapter] Failed to get key ${key}:`, error);
        }
      }),
    );

    return results;
  }

  /**
   * Set multiple values at once
   */
  async setMany<T>(entries: Map<string, T>): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readwrite");
      const store = transaction.objectStore("persistence");
      let completedCount = 0;
      const totalCount = entries.size;

      if (totalCount === 0) {
        resolve();
        return;
      }

      for (const [key, value] of entries) {
        const entry = {
          id: key,
          value,
          timestamp: Date.now(),
        };

        const request = store.put(entry);

        request.onsuccess = () => {
          completedCount++;
          if (completedCount === totalCount) {
            resolve();
          }
        };

        request.onerror = () => {
          const error = new Error(
            `Failed to set key ${key}: ${request.error?.message}`,
          );
          error.name = "STORAGE_UNAVAILABLE";
          reject(error);
        };
      }
    });
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["persistence"], "readonly");
      const store = transaction.objectStore("persistence");
      const countRequest = store.count();

      countRequest.onsuccess = async () => {
        try {
          // Get storage quota information
          const estimate = await navigator.storage.estimate();

          resolve({
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
            count: countRequest.result,
            oldestEntry: undefined, // TODO: Implement if needed
          });
        } catch {
          // Fallback if storage API not available
          resolve({
            used: 0,
            quota: 50 * 1024 * 1024, // 50MB fallback
            count: countRequest.result,
          });
        }
      };

      countRequest.onerror = () => {
        const error = new Error(
          `Failed to get storage info: ${countRequest.error?.message}`,
        );
        error.name = "STORAGE_UNAVAILABLE";
        reject(error);
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      Logger.debug("[IndexedDBAdapter] Database connection closed");
    }
  }
}

/**
 * Create a default IndexedDB adapter for React Query persistence
 */
export function createDefaultIndexedDBAdapter(): IndexedDBAdapter {
  return new IndexedDBAdapter({
    dbName: "digests_app",
    version: 1,
    stores: ["persistence", "auth_data", "user_prefs"],
  });
}
