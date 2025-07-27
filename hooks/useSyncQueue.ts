// ABOUTME: Offline sync queue manager for feed mutations with automatic retry
// ABOUTME: Handles queueing and replaying mutations when connection is restored

import { useMutation, UseMutationOptions, MutationKey } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOfflineStatus } from '@/lib/persistence'
import { IndexedDBAdapter } from '@/lib/persistence/indexdb-adapter'

interface QueuedMutation<TData = unknown, TError = unknown, TVariables = unknown> {
  id: string
  mutationKey: MutationKey
  variables: TVariables
  mutationFn: (variables: TVariables) => Promise<TData>
  timestamp: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: TError
  conflictResolution?: 'overwrite' | 'merge' | 'skip' | ((local: TData, remote: TData) => TData)
}

interface UseSyncQueueOptions {
  /**
   * Maximum number of retries for failed mutations
   */
  maxRetries?: number
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number
  
  /**
   * Whether to persist queue to storage
   */
  persistQueue?: boolean
  
  /**
   * Queue storage key
   */
  queueKey?: string
  
  /**
   * Callback when sync starts
   */
  onSyncStart?: () => void
  
  /**
   * Callback when sync completes
   */
  onSyncComplete?: (results: Array<{ id: string; success: boolean; error?: unknown }>) => void
  
  /**
   * Callback for individual mutation success
   */
  onMutationSuccess?: (id: string, data: unknown) => void
  
  /**
   * Callback for individual mutation error
   */
  onMutationError?: (id: string, error: unknown) => void
}

const SYNC_QUEUE_DB_NAME = 'digests_sync_queue'

// Enhanced interface for feed-specific operations
export interface FeedSyncOperation {
  id: string
  type: 'ADD_FEED' | 'UPDATE_FEED' | 'DELETE_FEED' | 'REFRESH_FEED' | 'BATCH_ADD_FEEDS'
  data: any
  timestamp: number
  feedUrl?: string
  feedId?: string
  priority: 'high' | 'medium' | 'low'
  dependencies?: string[] // IDs of operations this depends on
}

// Feed-specific sync queue options
export interface FeedSyncQueueOptions extends UseSyncQueueOptions {
  enableBatching?: boolean
  batchSize?: number
  batchTimeout?: number
}

/**
 * Hook for managing offline mutation queue
 */
export function useSyncQueue(options?: UseSyncQueueOptions) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    persistQueue = true,
    queueKey = 'default',
    onSyncStart,
    onSyncComplete,
    onMutationSuccess,
    onMutationError,
  } = options || {}

  const { isOnline } = useOfflineStatus()
  const [queue, setQueue] = useState<QueuedMutation[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const syncInProgressRef = useRef(false)
  const storageAdapter = useRef<IndexedDBAdapter>()

  // Initialize storage adapter
  useEffect(() => {
    if (persistQueue && !storageAdapter.current) {
      storageAdapter.current = new IndexedDBAdapter(SYNC_QUEUE_DB_NAME)
      loadQueueFromStorage()
    }
  }, [persistQueue])

  // Load queue from storage
  const loadQueueFromStorage = async () => {
    if (!storageAdapter.current) return

    try {
      const stored = await storageAdapter.current.get<QueuedMutation[]>(`queue_${queueKey}`)
      if (stored) {
        setQueue(stored)
      }
    } catch (error) {
      console.error('Failed to load sync queue from storage:', error)
    }
  }

  // Save queue to storage
  const saveQueueToStorage = async (updatedQueue: QueuedMutation[]) => {
    if (!storageAdapter.current || !persistQueue) return

    try {
      await storageAdapter.current.set(`queue_${queueKey}`, updatedQueue)
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error)
    }
  }

  // Add feed operation to queue with enhanced features
  const addToQueue = useCallback(
    (operation: FeedSyncOperation): string => {
      const queuedMutation: QueuedMutation = {
        id: operation.id,
        mutationKey: [operation.type, operation.feedUrl || operation.feedId],
        variables: operation.data,
        mutationFn: createMutationFn(operation),
        timestamp: operation.timestamp,
        retryCount: 0,
        maxRetries,
        status: 'pending',
      }

      setQueue(prev => {
        const updated = [...prev, queuedMutation]
        saveQueueToStorage(updated)
        return updated
      })

      // Try to sync immediately if online
      if (isOnline && !syncInProgressRef.current) {
        processSyncQueue()
      }

      return operation.id
    },
    [isOnline, maxRetries]
  )

  // Create mutation function based on operation type
  const createMutationFn = (operation: FeedSyncOperation) => {
    return async (variables: any) => {
      const { apiService } = await import('@/services/api-service')
      
      switch (operation.type) {
        case 'ADD_FEED':
          return await apiService.feeds.create(variables)
        case 'UPDATE_FEED':
          return await apiService.feeds.update(variables.id, variables)
        case 'DELETE_FEED':
          return await apiService.feeds.delete(variables.feedId || variables.id)
        case 'REFRESH_FEED':
          return await apiService.feeds.refresh(variables.feedId)
        case 'BATCH_ADD_FEEDS':
          // Process URLs sequentially to avoid overwhelming the API
          const results = { feeds: [], items: [], successfulCount: 0, failedCount: 0, failedUrls: [] }
          for (const url of variables.urls) {
            try {
              const feed = await apiService.feeds.create({ url })
              const feedData = await apiService.refreshFeeds([feed.feedUrl])
              results.feeds.push(...feedData.feeds)
              results.items.push(...feedData.items)
              results.successfulCount++
            } catch (error) {
              results.failedUrls.push(url)
              results.failedCount++
            }
          }
          return results
        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }
    }
  }

  // Add mutation to queue (legacy method for compatibility)
  const queueMutation = useCallback(
    <TData = unknown, TError = unknown, TVariables = unknown>(
      mutation: {
        mutationKey: MutationKey
        mutationFn: (variables: TVariables) => Promise<TData>
        variables: TVariables
        conflictResolution?: QueuedMutation['conflictResolution']
      }
    ): string => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const queuedMutation: QueuedMutation<TData, TError, TVariables> = {
        id,
        mutationKey: mutation.mutationKey,
        variables: mutation.variables,
        mutationFn: mutation.mutationFn,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        status: 'pending',
        conflictResolution: mutation.conflictResolution,
      }

      setQueue(prev => {
        const updated = [...prev, queuedMutation]
        saveQueueToStorage(updated)
        return updated
      })

      // Try to sync immediately if online
      if (isOnline && !syncInProgressRef.current) {
        processSyncQueue()
      }

      return id
    },
    [isOnline, maxRetries]
  )

  // Remove mutation from queue
  const removeMutation = useCallback((id: string) => {
    setQueue(prev => {
      const updated = prev.filter(m => m.id !== id)
      saveQueueToStorage(updated)
      return updated
    })
  }, [])

  // Clear entire queue
  const clearQueue = useCallback(async () => {
    setQueue([])
    if (storageAdapter.current && persistQueue) {
      await storageAdapter.current.delete(`queue_${queueKey}`)
    }
  }, [persistQueue, queueKey])

  // Get queue status
  const getQueueStatus = useCallback(() => {
    const pending = queue.filter(m => m.status === 'pending').length
    const processing = queue.filter(m => m.status === 'processing').length
    const failed = queue.filter(m => m.status === 'error').length
    const succeeded = queue.filter(m => m.status === 'success').length

    return {
      total: queue.length,
      pending,
      processing,
      failed,
      succeeded,
      isEmpty: queue.length === 0,
    }
  }, [queue])

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || queue.length === 0) return

    syncInProgressRef.current = true
    setIsSyncing(true)
    onSyncStart?.()

    const results: Array<{ id: string; success: boolean; error?: unknown }> = []
    const pendingMutations = queue.filter(m => m.status === 'pending' || m.status === 'error')

    for (const mutation of pendingMutations) {
      // Update status to processing
      setQueue(prev => prev.map(m => 
        m.id === mutation.id ? { ...m, status: 'processing' as const } : m
      ))

      try {
        // Execute the mutation
        const result = await mutation.mutationFn(mutation.variables)
        
        // Update status to success
        setQueue(prev => prev.map(m => 
          m.id === mutation.id ? { ...m, status: 'success' as const } : m
        ))

        results.push({ id: mutation.id, success: true })
        onMutationSuccess?.(mutation.id, result)

        // Remove successful mutation from queue after a delay
        setTimeout(() => removeMutation(mutation.id), 1000)
      } catch (error) {
        const shouldRetry = mutation.retryCount < mutation.maxRetries

        // Update mutation with error and retry count
        setQueue(prev => prev.map(m => 
          m.id === mutation.id 
            ? { 
                ...m, 
                status: shouldRetry ? 'pending' : 'error' as const,
                error: error as any,
                retryCount: m.retryCount + 1,
              } 
            : m
        ))

        results.push({ id: mutation.id, success: false, error })
        onMutationError?.(mutation.id, error)

        // Add retry delay if retrying
        if (shouldRetry && retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    syncInProgressRef.current = false
    setIsSyncing(false)
    onSyncComplete?.(results)

    // Save updated queue state
    saveQueueToStorage(queue)
  }, [isOnline, queue, retryDelay, onSyncStart, onSyncComplete, onMutationSuccess, onMutationError, removeMutation])

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && !syncInProgressRef.current && queue.some(m => m.status === 'pending')) {
      processSyncQueue()
    }
  }, [isOnline, queue, processSyncQueue])

  // Force sync
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }
    await processSyncQueue()
  }, [isOnline, processSyncQueue])

  return {
    queue,
    queueMutation,
    addToQueue, // Enhanced method for feed operations
    removeMutation,
    clearQueue,
    forceSync,
    isSyncing,
    isOnline,
    queueStatus: getQueueStatus(),
  }
}

/**
 * Hook for creating offline-capable mutations
 */
export function useOfflineMutation<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown
>(
  mutationKey: MutationKey,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext> & {
    queueOptions?: {
      conflictResolution?: QueuedMutation['conflictResolution']
      queueKey?: string
    }
  }
) {
  const { queueOptions, ...mutationOptions } = options || {}
  const { isOnline } = useOfflineStatus()
  const syncQueue = useSyncQueue({ queueKey: queueOptions?.queueKey })

  // Create the base mutation
  const mutation = useMutation({
    ...mutationOptions,
    mutationKey,
    mutationFn: async (variables: TVariables) => {
      // If offline, queue the mutation
      if (!isOnline) {
        const id = syncQueue.queueMutation({
          mutationKey,
          mutationFn,
          variables,
          conflictResolution: queueOptions?.conflictResolution,
        })

        // Return a pending promise that resolves when the mutation is processed
        return new Promise<TData>((resolve, reject) => {
          const checkInterval = setInterval(() => {
            const mutation = syncQueue.queue.find(m => m.id === id)
            if (!mutation) {
              clearInterval(checkInterval)
              reject(new Error('Mutation removed from queue'))
            } else if (mutation.status === 'success') {
              clearInterval(checkInterval)
              resolve(mutation as any)
            } else if (mutation.status === 'error' && mutation.retryCount >= mutation.maxRetries) {
              clearInterval(checkInterval)
              reject(mutation.error)
            }
          }, 100)
        })
      }

      // If online, execute normally
      return mutationFn(variables)
    },
  })

  return {
    ...mutation,
    isQueued: !isOnline && mutation.isPending,
    queueStatus: syncQueue.queueStatus,
  }
}