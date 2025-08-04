/**
 * Main entry point for the persistence layer
 * Exports configured persistence utilities for React Query
 */

import { QueryClient } from "@tanstack/react-query";
import { IndexedDBAdapter } from "./indexdb-adapter";
import { createQueryPersister } from "./react-query-persister";
import type { QueryPersistConfig } from "@/types/persistence";

// Default configuration
const DEFAULT_CONFIG: Omit<QueryPersistConfig, "adapter"> = {
  throttleTime: 1000,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  batchingInterval: 100,
  persistedQueries: [
    "feeds", // Feed data
    "feed-items", // Articles
    "reader-view", // Reader view content
    "auth", // Authentication
    "user", // User preferences
  ],
  excludedQueries: [
    "temp", // Temporary data
    "search", // Search results (too dynamic)
  ],
};

/**
 * Create a persistence-enabled QueryClient
 */
export function createPersistedQueryClient(
  config: Partial<QueryPersistConfig> = {},
): QueryClient & { restorePersistedData: () => Promise<void> } {
  // Check if IndexedDB is supported
  if (!IndexedDBAdapter.isSupported()) {
    console.warn("IndexedDB not supported, falling back to memory-only cache");
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes
        },
      },
    });

    // Add no-op restore function for consistency
    return Object.assign(client, {
      restorePersistedData: async () => {
        console.log(
          "[Persistence] IndexedDB not supported, skipping data restoration",
        );
      },
    });
  }

  // Create adapter and config
  const adapter = new IndexedDBAdapter();
  const persistConfig: QueryPersistConfig = {
    ...DEFAULT_CONFIG,
    adapter,
    ...config,
  };

  // Create query client with persistence
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: persistConfig.maxAge, // Match persistence TTL
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes("4")) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  });

  // Add persistence observers
  const persister = createQueryPersister(adapter, persistConfig);

  // Set up query cache observers
  const queryCache = queryClient.getQueryCache();

  // Persist on data update
  queryCache.subscribe((event) => {
    if (event.type === "updated" && event.query.state.data !== undefined) {
      console.log("[Persistence] Persisting query data:", event.query.queryKey);
      persister.persistQuery(event.query.queryKey, event.query.state.data);
    } else if (event.type === "removed") {
      console.log("[Persistence] Removing query data:", event.query.queryKey);
      persister.removeQuery(event.query.queryKey);
    }
  });

  // Create restore function that can be called manually
  async function restorePersistedData(): Promise<void> {
    console.log("[Persistence] Starting data restoration...");

    try {
      // Try to restore common query patterns
      const commonQueries = [
        ["feeds", "list"],
        ["feeds", "list", { filters: undefined }],
        ["auth", "user"],
        ["user", "preferences"],
      ];

      let restoredCount = 0;

      for (const queryKey of commonQueries) {
        try {
          const existingData = queryClient.getQueryData(queryKey);
          if (!existingData) {
            // Try to restore this data using the persister
            const restoredData = await persister.restoreQuery(queryKey);
            if (restoredData) {
              queryClient.setQueryData(queryKey, restoredData);
              restoredCount++;
              console.log(
                "[Persistence] Restored query:",
                queryKey,
                "Data size:",
                JSON.stringify(restoredData).length,
                "bytes",
              );
            }
          } else {
            console.log(
              "[Persistence] Query already has data, skipping:",
              queryKey,
            );
          }
        } catch (error) {
          console.warn(
            "[Persistence] Failed to restore query:",
            queryKey,
            error,
          );
        }
      }

      // Also try to get all keys to see what's actually stored
      try {
        const allKeys = await adapter.keys("rq_");
        console.log(
          "[Persistence] Found stored keys:",
          allKeys.length,
          allKeys,
        );
      } catch (error) {
        console.warn("[Persistence] Could not list keys:", error);
      }

      console.log(
        `[Persistence] Data restoration completed. Restored ${restoredCount} queries.`,
      );
    } catch (error) {
      console.error("[Persistence] Data restoration failed:", error);
    }
  }

  // Add the restore function to the client
  return Object.assign(queryClient, {
    restorePersistedData,
  });
}

/**
 * Hook to check offline status and sync state
 */
export function useOfflineStatus() {
  const isOnline = typeof window !== "undefined" ? navigator.onLine : true;

  // Track last successful sync
  const getLastSync = () => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("digests_last_sync") || "0", 10);
  };

  const updateLastSync = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("digests_last_sync", Date.now().toString());
    }
  };

  return {
    isOnline,
    lastSync: getLastSync(),
    updateLastSync,
    isStale: Date.now() - getLastSync() > 60 * 60 * 1000, // 1 hour
  };
}

/**
 * Utility to manage storage quota
 */
export async function checkStorageHealth() {
  if (!("storage" in navigator && "estimate" in navigator.storage)) {
    return {
      healthy: true,
      usage: 0,
      quota: Infinity,
      percentage: 0,
    };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || Infinity;
  const percentage = (usage / quota) * 100;

  return {
    healthy: percentage < 80,
    usage,
    quota,
    percentage,
    needsCleanup: percentage > 90,
  };
}

/**
 * Clear all persisted data (for logout, reset, etc.)
 */
export async function clearPersistedData() {
  const adapter = new IndexedDBAdapter();
  await adapter.clear();

  // Also clear any other storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("digests_last_sync");
  }
}

/**
 * Create a default IndexedDB adapter for testing and convenience
 */
export function createDefaultIndexedDBAdapter() {
  if (!IndexedDBAdapter.isSupported()) {
    throw new Error("IndexedDB is not supported in this environment");
  }
  return new IndexedDBAdapter();
}

// Export types for convenience
export type { QueryPersistConfig } from "@/types/persistence";
export { IndexedDBAdapter } from "./indexdb-adapter";
export {
  createQueryPersister,
  createSecurePersisterWithKey,
} from "./react-query-persister";
