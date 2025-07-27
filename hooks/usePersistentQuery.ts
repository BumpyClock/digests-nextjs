/**
 * usePersistentQuery - A wrapper around useQuery with automatic persistence
 * Provides offline-first functionality with automatic sync
 */

import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useOfflineStatus } from '@/lib/persistence'
import type { QueryPersistOptions } from '@/types/persistence'

interface UsePersistentQueryOptions<TData, TError = unknown> 
  extends UseQueryOptions<TData, TError>, QueryPersistOptions {
  /**
   * Whether to sync immediately when coming online
   */
  syncOnReconnect?: boolean
  
  /**
   * Custom sync function for conflict resolution
   */
  syncFn?: (localData: TData, remoteData: TData) => TData
  
  /**
   * Whether to prefetch from persistence before network
   */
  offlineFirst?: boolean
  
  /**
   * Callback when data is restored from persistence
   */
  onRestore?: (data: TData) => void
  
  /**
   * Callback when sync conflict occurs
   */
  onConflict?: (localData: TData, remoteData: TData) => void
}

/**
 * Enhanced useQuery hook with persistence support
 */
export function usePersistentQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UsePersistentQueryOptions<TData, TError>
): UseQueryResult<TData, TError> & {
  isRestored: boolean
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncTime: number | null
  forceSync: () => Promise<void>
} {
  const {
    persist = true,
    ttl,
    encrypt = false,
    meta,
    syncOnReconnect = true,
    syncFn,
    offlineFirst = true,
    onRestore,
    onConflict,
    ...queryOptions
  } = options || {}

  const { isOnline, lastSync, updateLastSync } = useOfflineStatus()
  const syncStatusRef = useRef<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const isRestoredRef = useRef(false)
  const lastSyncTimeRef = useRef<number | null>(lastSync)

  // Create enhanced query function that handles offline-first behavior
  const enhancedQueryFn = useCallback(async () => {
    // If offline and we have cached data, don't try to fetch
    if (!isOnline && queryOptions.enabled !== false) {
      const cachedData = queryOptions.initialData || queryOptions.placeholderData
      if (cachedData) {
        return cachedData as TData
      }
    }

    // Otherwise, proceed with normal fetch
    return queryFn()
  }, [isOnline, queryFn, queryOptions.enabled, queryOptions.initialData, queryOptions.placeholderData])

  // Configure persistence options
  const persistOptions: QueryPersistOptions = {
    persist,
    ttl,
    encrypt,
    meta: {
      ...meta,
      lastSync: lastSyncTimeRef.current || undefined,
    },
  }

  // Use the base query with enhanced options
  const query = useQuery({
    ...queryOptions,
    queryKey,
    queryFn: enhancedQueryFn,
    // Enable stale-while-revalidate for offline-first
    staleTime: offlineFirst ? (ttl || 5 * 60 * 1000) : queryOptions.staleTime,
    // Keep cached data longer when offline-first
    gcTime: offlineFirst ? (ttl || 24 * 60 * 60 * 1000) : queryOptions.gcTime,
    // Disable background refetch when offline
    refetchInterval: isOnline ? queryOptions.refetchInterval : false,
    refetchIntervalInBackground: isOnline ? queryOptions.refetchIntervalInBackground : false,
    // Custom meta for persistence
    meta: persistOptions,
  })

  // Handle data restoration
  useEffect(() => {
    if (query.data && !isRestoredRef.current && onRestore) {
      // Check if this data was restored from persistence
      const isFromCache = query.dataUpdatedAt < Date.now() - 1000
      if (isFromCache) {
        isRestoredRef.current = true
        onRestore(query.data)
      }
    }
  }, [query.data, query.dataUpdatedAt, onRestore])

  // Handle sync on reconnect
  useEffect(() => {
    if (isOnline && syncOnReconnect && query.data) {
      handleSync()
    }
  }, [isOnline])

  // Sync function
  const handleSync = useCallback(async () => {
    if (!query.data || syncStatusRef.current === 'syncing') return

    syncStatusRef.current = 'syncing'

    try {
      // Fetch fresh data from server
      const freshData = await queryFn()

      // Handle conflict resolution
      if (syncFn && query.data) {
        const resolvedData = syncFn(query.data, freshData)
        
        // Check if there was a conflict
        if (JSON.stringify(resolvedData) !== JSON.stringify(freshData)) {
          onConflict?.(query.data, freshData)
        }

        // Update with resolved data
        query.refetch()
      } else {
        // No custom sync function, just update with fresh data
        query.refetch()
      }

      syncStatusRef.current = 'success'
      lastSyncTimeRef.current = Date.now()
      updateLastSync()
    } catch (error) {
      syncStatusRef.current = 'error'
      console.error('Sync failed:', error)
    }
  }, [query, queryFn, syncFn, onConflict, updateLastSync])

  // Force sync function
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }
    await handleSync()
  }, [isOnline, handleSync])

  return {
    ...query,
    isRestored: isRestoredRef.current,
    syncStatus: syncStatusRef.current,
    lastSyncTime: lastSyncTimeRef.current,
    forceSync,
  }
}

/**
 * Hook for managing multiple persistent queries with batch operations
 */
export function usePersistentQueries<TData = unknown>(
  queries: Array<{
    queryKey: QueryKey
    queryFn: () => Promise<TData>
    options?: UsePersistentQueryOptions<TData>
  }>
) {
  const results = queries.map(({ queryKey, queryFn, options }) =>
    usePersistentQuery(queryKey, queryFn, options)
  )

  const syncAll = useCallback(async () => {
    await Promise.all(results.map(result => result.forceSync()))
  }, [results])

  const allSynced = results.every(r => r.syncStatus === 'success')
  const anySyncing = results.some(r => r.syncStatus === 'syncing')
  const anyError = results.some(r => r.syncStatus === 'error')

  return {
    queries: results,
    syncAll,
    syncStatus: anySyncing ? 'syncing' : anyError ? 'error' : allSynced ? 'success' : 'idle',
  }
}

/**
 * Hook for prefetching and persisting query data
 */
export function usePrefetchPersistentQuery() {
  const { isOnline } = useOfflineStatus()

  const prefetchPersistent = useCallback(
    async <TData = unknown>(
      queryKey: QueryKey,
      queryFn: () => Promise<TData>,
      options?: QueryPersistOptions
    ) => {
      // Only prefetch if online
      if (!isOnline) return

      try {
        const data = await queryFn()
        
        // Store in React Query cache with persistence options
        const { queryClient } = await import('@/lib/query-client')
        queryClient.setQueryData(queryKey, data, {
          updatedAt: Date.now(),
          meta: options,
        })
      } catch (error) {
        console.error('Prefetch failed:', error)
      }
    },
    [isOnline]
  )

  return { prefetchPersistent }
}