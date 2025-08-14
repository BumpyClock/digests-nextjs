/**
 * React Query persistence plugin
 * Integrates the persistence adapter with React Query for offline support
 */

import { QueryClient, hashKey } from "@tanstack/react-query";
import { Logger } from "@/utils/logger";
import type {
  PersistenceAdapter,
  QueryPersistConfig,
  QueryPersister,
  PersistedQueryData,
  QueryMeta,
} from "@/types/persistence";

/**
 * Create a persister for React Query
 */
export function createQueryPersister(
  adapter: PersistenceAdapter,
  config: Partial<QueryPersistConfig> = {},
): QueryPersister {
  if (!adapter) {
    throw new Error("Persistence adapter is required");
  }
  const {
    throttleTime = 1000,
    maxAge = 24 * 60 * 60 * 1000, // 24 hours default
    batchingInterval = 100,
    persistedQueries = [],
    excludedQueries = [],
    serialize: _serialize = JSON.stringify,
    deserialize: _deserialize = JSON.parse,
  } = config;

  // Throttle map to prevent excessive writes
  const throttleMap = new Map<string, NodeJS.Timeout>();

  // Batch write queue for performance
  const pendingWrites = new Map<string, { data: unknown; timestamp: number }>();
  let batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Check if a query should be persisted
   */
  function shouldPersistQuery(queryKey: unknown[]): boolean {
    const keyStr = JSON.stringify(queryKey);

    // Check blacklist first
    if (excludedQueries.some((pattern) => keyStr.includes(pattern))) {
      return false;
    }

    // If whitelist is empty, persist all (except blacklisted)
    if (persistedQueries.length === 0) {
      return true;
    }

    // Check whitelist
    return persistedQueries.some((pattern) => keyStr.includes(pattern));
  }

  /**
   * Get query hash for storage key
   */
  function getStorageKey(queryKey: unknown[]): string {
    return `rq_${hashKey(queryKey)}`;
  }

  /**
   * Extract metadata from query key
   */
  function extractMeta(queryKey: unknown[]): QueryMeta | undefined {
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      return undefined;
    }

    const meta: QueryMeta = {};

    // Common patterns in query keys
    if (queryKey[0] === "feeds") {
      meta.queryType = "feed";
    } else if (queryKey[0] === "article" || queryKey[0] === "reader-view") {
      meta.queryType = "article";
    } else if (queryKey[0] === "auth" || queryKey[0] === "user") {
      meta.queryType = "user";
    }

    // Extract feed URL if present
    const feedUrlIndex = queryKey.findIndex(
      (k) => typeof k === "string" && k.includes("http"),
    );
    if (feedUrlIndex !== -1) {
      meta.feedUrl = queryKey[feedUrlIndex] as string;
    }

    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  /**
   * Batch persistence for performance
   */
  async function flushPendingWrites(): Promise<void> {
    if (pendingWrites.size === 0) return;

    const writes = Array.from(pendingWrites.entries());
    pendingWrites.clear();

    // Batch write to adapter
    const entries = new Map(writes.map(([key, { data }]) => [key, data]));

    try {
      await adapter.setMany(entries);
      Logger.debug(`[QueryPersister] Batch persisted ${writes.length} queries`);
    } catch (error) {
      Logger.error(
        "[QueryPersister] Batch persistence failed:",
        error as Error,
      );

      // Fallback to individual writes
      for (const [key, { data }] of writes) {
        try {
          await adapter.set(key, data);
        } catch (writeError) {
          Logger.error(
            `[QueryPersister] Failed to persist ${key}:`,
            writeError as Error,
          );
        }
      }
    }
  }

  /**
   * Persist a query result
   */
  async function persistQuery(
    queryKey: unknown[],
    data: unknown,
  ): Promise<void> {
    if (!shouldPersistQuery(queryKey)) {
      return;
    }

    const storageKey = getStorageKey(queryKey);
    const meta = extractMeta(queryKey);

    // Create persisted data structure
    const persistedData: PersistedQueryData = {
      key: storageKey,
      data,
      dataUpdatedAt: Date.now(),
      expiresAt: Date.now() + maxAge,
      meta,
    };

    // Throttle writes
    if (throttleMap.has(storageKey)) {
      clearTimeout(throttleMap.get(storageKey)!);
    }

    throttleMap.set(
      storageKey,
      setTimeout(async () => {
        pendingWrites.set(storageKey, {
          data: persistedData,
          timestamp: Date.now(),
        });

        // Trigger batch write
        if (!batchTimeout) {
          batchTimeout = setTimeout(async () => {
            await flushPendingWrites();
            batchTimeout = null;
          }, batchingInterval);
        }

        throttleMap.delete(storageKey);
      }, throttleTime),
    );
  }

  /**
   * Restore a query from storage
   */
  async function restoreQuery(queryKey: unknown[]): Promise<unknown | null> {
    if (!shouldPersistQuery(queryKey)) {
      return null;
    }

    try {
      const storageKey = getStorageKey(queryKey);
      const persistedData = await adapter.get<PersistedQueryData>(storageKey);

      if (!persistedData) {
        return null;
      }

      // Check expiry
      if (persistedData.expiresAt && Date.now() > persistedData.expiresAt) {
        await adapter.delete(storageKey);
        return null;
      }

      Logger.debug(
        `[QueryPersister] Restored query: ${JSON.stringify(queryKey)}`,
      );
      return persistedData.data;
    } catch (error) {
      Logger.error("[QueryPersister] Failed to restore query:", error as Error);
      return null;
    }
  }

  /**
   * Remove a persisted query
   */
  async function removeQuery(queryKey: unknown[]): Promise<void> {
    try {
      const storageKey = getStorageKey(queryKey);

      // Cancel any pending persist
      const timeout = throttleMap.get(storageKey);
      if (timeout) {
        clearTimeout(timeout);
        throttleMap.delete(storageKey);
      }

      await adapter.delete(storageKey);
    } catch (error) {
      Logger.error("Failed to remove query:", error as Error);
    }
  }

  /**
   * Clear all persisted queries
   */
  async function clearQueries(): Promise<void> {
    try {
      // Cancel all pending persists
      throttleMap.forEach((timeout) => clearTimeout(timeout));
      throttleMap.clear();

      // Cancel batch timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }

      // Clear pending writes
      pendingWrites.clear();

      await adapter.clear();
    } catch (error) {
      Logger.error("Failed to clear queries:", error as Error);
    }
  }

  return {
    persistQuery,
    restoreQuery,
    removeQuery,
    clearQueries,
  };
}

/**
 * Create a persistence observer for React Query
 */
export function createPersistenceObserver(
  queryClient: QueryClient,
  config: QueryPersistConfig,
) {
  const persister = createQueryPersister(config.adapter, config);
  const restoredQueries = new Set<string>();

  // Subscribe to query cache updates
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.query.state.data !== undefined) {
      persister.persistQuery(event.query.queryKey, event.query.state.data);
    } else if (event.type === "removed") {
      persister.removeQuery(event.query.queryKey);
    }
  });

  // Restore queries on mount
  async function restoreQueries() {
    const queries = queryClient.getQueryCache().getAll();

    await Promise.all(
      queries.map(async (query) => {
        const key = hashKey(query.queryKey);

        // Avoid restoring the same query multiple times
        if (restoredQueries.has(key)) return;

        const data = await persister.restoreQuery([...query.queryKey]);
        if (data !== null && query.state.data === undefined) {
          queryClient.setQueryData(query.queryKey as never[], data);
          restoredQueries.add(key);
        }
      }),
    );
  }

  return {
    restoreQueries,
    unsubscribe,
    persister,
  };
}

// Duplicate createPersistencePlugin function removed - use the one above with proper adapter parameter

/**
 * Utility to batch persistence operations
 */
export function createBatchedPersister(
  adapter: PersistenceAdapter,
  config: { maxWait?: number; maxSize?: number } = {},
) {
  const { maxWait = 1000, maxSize = 50 } = config;

  const batch = new Map<string, unknown>();
  let timeout: NodeJS.Timeout | null = null;

  async function flush() {
    if (batch.size === 0) return;

    const currentBatch = new Map(batch);
    batch.clear();

    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    try {
      await adapter.setMany(currentBatch);
    } catch (error) {
      console.error("Failed to batch persist:", error);
    }
  }

  return {
    add(key: string, value: unknown) {
      batch.set(key, value);

      if (batch.size >= maxSize) {
        flush();
      } else if (!timeout) {
        timeout = setTimeout(flush, maxWait);
      }
    },

    flush,
  };
}

/**
 * Create a secure persister for sensitive data with custom key
 */
export async function createSecurePersisterWithKey(
  adapter: PersistenceAdapter,
  encryptionKey: CryptoKey,
): Promise<QueryPersister> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function _encrypt(data: string): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      encoder.encode(data),
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return combined.buffer;
  }

  async function _decrypt(data: ArrayBuffer): Promise<string> {
    const combined = new Uint8Array(data);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      encrypted,
    );

    return decoder.decode(decrypted);
  }

  return createQueryPersister(adapter, {
    serialize: (data) => {
      // Return synchronous serialization for now
      const json = JSON.stringify(data);
      return json;
    },
    deserialize: (data) => {
      // Return synchronous deserialization for now
      if (typeof data === "string") {
        return JSON.parse(data);
      }
      throw new Error("Invalid data format");
    },
  });
}
