/**
 * Main entry point for the persistence layer
 * Exports configured persistence utilities for React Query
 */

import { QueryClient } from '@tanstack/react-query'
import { IndexedDBAdapter } from './indexdb-adapter'
import { createPersistencePlugin, createQueryPersister } from './react-query-persister'
import type { QueryPersistConfig } from '@/types/persistence'

// Default configuration
const DEFAULT_CONFIG: QueryPersistConfig = {
  throttleTime: 1000,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  batchingInterval: 100,
  persistedQueries: [
    'feeds',      // Feed data
    'feed-items', // Articles
    'reader-view', // Reader view content
    'auth',       // Authentication
    'user',       // User preferences
  ],
  excludedQueries: [
    'temp',       // Temporary data
    'search',     // Search results (too dynamic)
  ],
}

/**
 * Create a persistence-enabled QueryClient
 */
export function createPersistedQueryClient(
  config: Partial<QueryPersistConfig> = {}
): QueryClient {
  // Check if IndexedDB is supported
  if (!IndexedDBAdapter.isSupported()) {
    console.warn('IndexedDB not supported, falling back to memory-only cache')
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes
        },
      },
    })
  }

  // Create adapter and config
  const adapter = new IndexedDBAdapter()
  const persistConfig: QueryPersistConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    adapter,
  }

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
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          return failureCount < 3
        },
      },
    },
  })

  // Add persistence observers
  const persister = createQueryPersister(adapter, persistConfig)

  // Set up query cache observers
  const queryCache = queryClient.getQueryCache()

  // Persist on data update
  queryCache.subscribe((event) => {
    if (event.type === 'updated' && event.query.state.data !== undefined) {
      persister.persistQuery(event.query.queryKey, event.query.state.data)
    } else if (event.type === 'removed') {
      persister.removeQuery(event.query.queryKey)
    }
  })

  // Restore persisted data on mount
  queryClient.mount = async function() {
    // Call original mount
    QueryClient.prototype.mount.call(this)

    // Restore persisted queries
    const queries = queryCache.getAll()
    
    await Promise.all(
      queries.map(async (query) => {
        const data = await persister.restoreQuery(query.queryKey)
        if (data !== null && query.state.data === undefined) {
          queryClient.setQueryData(query.queryKey, data)
        }
      })
    )
  }

  return queryClient
}

/**
 * Hook to check offline status and sync state
 */
export function useOfflineStatus() {
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true
  
  // Track last successful sync
  const getLastSync = () => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem('digests_last_sync') || '0', 10)
  }

  const updateLastSync = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('digests_last_sync', Date.now().toString())
    }
  }

  return {
    isOnline,
    lastSync: getLastSync(),
    updateLastSync,
    isStale: Date.now() - getLastSync() > 60 * 60 * 1000, // 1 hour
  }
}

/**
 * Utility to manage storage quota
 */
export async function checkStorageHealth() {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return {
      healthy: true,
      usage: 0,
      quota: Infinity,
      percentage: 0,
    }
  }

  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage || 0
  const quota = estimate.quota || Infinity
  const percentage = (usage / quota) * 100

  return {
    healthy: percentage < 80,
    usage,
    quota,
    percentage,
    needsCleanup: percentage > 90,
  }
}

/**
 * Clear all persisted data (for logout, reset, etc.)
 */
export async function clearPersistedData() {
  const adapter = new IndexedDBAdapter()
  await adapter.clear()
  
  // Also clear any other storage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('digests_last_sync')
  }
}

// Export types for convenience
export type { QueryPersistConfig } from '@/types/persistence'
export { IndexedDBAdapter } from './indexdb-adapter'
export { createQueryPersister, createSecurePersister } from './react-query-persister'