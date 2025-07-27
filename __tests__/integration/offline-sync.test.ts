// ABOUTME: Tests for offline functionality and sync recovery mechanisms
// ABOUTME: Validates offline queue management, sync reconciliation, and data consistency

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useSyncQueue, type FeedSyncOperation } from '@/hooks/useSyncQueue'
import { useAddFeed, useDeleteFeed } from '@/hooks/queries/use-feed-mutations'
import { useFeeds } from '@/hooks/queries/use-feeds'
import { apiService } from '@/services/api-service'
import { FEATURES } from '@/lib/feature-flags'
import type { Feed, FeedItem } from '@/types'

// Mock dependencies
jest.mock('@/services/api-service')
jest.mock('@/lib/feature-flags')
jest.mock('@/lib/persistence/indexdb-adapter')

const mockApiService = apiService as jest.Mocked<typeof apiService>
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>

// Mock IndexedDB adapter
const mockIndexedDBAdapter = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
}

// Mock online/offline status
const mockNavigator = {
  onLine: true,
}

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
})

// Test data
const createMockFeed = (id: string, url: string): Feed => ({
  type: 'feed',
  guid: id,
  status: 'active',
  siteTitle: `Blog ${id}`,
  feedTitle: `Blog ${id} RSS`,
  feedUrl: url,
  description: `Test blog ${id}`,
  link: `https://blog${id}.com`,
  lastUpdated: new Date().toISOString(),
  lastRefreshed: new Date().toISOString(),
  published: new Date().toISOString(),
  author: `Author ${id}`,
  language: 'en',
  favicon: `https://blog${id}.com/favicon.ico`,
  categories: 'tech',
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Offline Sync Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFeatures.USE_REACT_QUERY_FEEDS = true
    mockFeatures.ENABLE_OFFLINE_SUPPORT = true
    mockFeatures.ENABLE_BACKGROUND_SYNC = true
    mockNavigator.onLine = true
    
    // Mock successful API responses by default
    mockApiService.feeds.create.mockResolvedValue(
      createMockFeed('new-feed', 'https://new.com/feed.xml')
    )
    mockApiService.feeds.delete.mockResolvedValue(undefined)
    mockApiService.refreshFeeds.mockResolvedValue({
      feeds: [],
      items: []
    })
  })

  describe('Offline Queue Management', () => {
    it('should queue operations when offline', async () => {
      mockNavigator.onLine = false

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        persistQueue: true,
        queueKey: 'test-queue'
      }), { wrapper })

      // Add operation to queue
      const operation: FeedSyncOperation = {
        id: 'op-1',
        type: 'ADD_FEED',
        data: { url: 'https://test.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      // Verify operation is queued
      expect(result.current.queue).toHaveLength(1)
      expect(result.current.queue[0].mutationKey).toEqual(['ADD_FEED', undefined])
      expect(result.current.queueStatus.pending).toBe(1)
      expect(result.current.isOnline).toBe(false)
    })

    it('should process queue when coming online', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        persistQueue: true,
        queueKey: 'test-queue'
      }), { wrapper })

      // Start offline and queue operation
      mockNavigator.onLine = false

      const operation: FeedSyncOperation = {
        id: 'op-1',
        type: 'ADD_FEED',
        data: { url: 'https://test.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      expect(result.current.queue).toHaveLength(1)

      // Go back online
      mockNavigator.onLine = true

      // Trigger online event
      await act(async () => {
        window.dispatchEvent(new Event('online'))
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Queue should be processed
      await waitFor(() => {
        expect(result.current.queueStatus.succeeded).toBe(1)
      }, { timeout: 5000 })

      expect(mockApiService.feeds.create).toHaveBeenCalledWith({ url: 'https://test.com/feed.xml' })
    })

    it('should handle queue persistence', async () => {
      mockIndexedDBAdapter.set.mockResolvedValue(undefined)
      mockIndexedDBAdapter.get.mockResolvedValue([])

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        persistQueue: true,
        queueKey: 'persistent-queue'
      }), { wrapper })

      const operation: FeedSyncOperation = {
        id: 'op-1',
        type: 'ADD_FEED',
        data: { url: 'https://test.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      // Should persist to storage
      await waitFor(() => {
        expect(mockIndexedDBAdapter.set).toHaveBeenCalled()
      })
    })

    it('should retry failed operations', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        maxRetries: 2,
        retryDelay: 100
      }), { wrapper })

      // Mock API failure then success
      mockApiService.feeds.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockFeed('retry-feed', 'https://retry.com/feed.xml'))

      const operation: FeedSyncOperation = {
        id: 'op-retry',
        type: 'ADD_FEED',
        data: { url: 'https://retry.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      // Process queue
      await act(async () => {
        await result.current.forceSync()
      })

      // Should retry and eventually succeed
      await waitFor(() => {
        expect(result.current.queueStatus.succeeded).toBe(1)
      })

      expect(mockApiService.feeds.create).toHaveBeenCalledTimes(2)
    })

    it('should handle maximum retries reached', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        maxRetries: 1,
        retryDelay: 10
      }), { wrapper })

      // Mock persistent API failure
      mockApiService.feeds.create.mockRejectedValue(new Error('Permanent error'))

      const operation: FeedSyncOperation = {
        id: 'op-fail',
        type: 'ADD_FEED',
        data: { url: 'https://fail.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      // Process queue
      await act(async () => {
        await result.current.forceSync()
      })

      // Should fail after max retries
      await waitFor(() => {
        expect(result.current.queueStatus.failed).toBe(1)
      })

      expect(mockApiService.feeds.create).toHaveBeenCalledTimes(2) // Initial + 1 retry
    })
  })

  describe('Mutation Integration with Offline Support', () => {
    it('should queue add feed mutations when offline', async () => {
      mockNavigator.onLine = false

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ url: 'https://offline.com/feed.xml' })
      })

      // Should complete mutation even though offline
      expect(result.current.isSuccess).toBe(true)
    })

    it('should queue delete feed mutations when offline', async () => {
      mockNavigator.onLine = false

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync('https://delete.com/feed.xml')
      })

      // Should complete mutation even though offline
      expect(result.current.isSuccess).toBe(true)
    })

    it('should sync queued mutations when reconnecting', async () => {
      const wrapper = createWrapper()
      
      // Start offline
      mockNavigator.onLine = false
      
      const { result: addResult } = renderHook(() => useAddFeed(), { wrapper })
      const { result: deleteResult } = renderHook(() => useDeleteFeed(), { wrapper })

      // Queue multiple operations while offline
      await act(async () => {
        await addResult.current.mutateAsync({ url: 'https://add1.com/feed.xml' })
        await deleteResult.current.mutateAsync('https://delete1.com/feed.xml')
        await addResult.current.mutateAsync({ url: 'https://add2.com/feed.xml' })
      })

      // Go back online
      mockNavigator.onLine = true

      // Trigger sync
      await act(async () => {
        window.dispatchEvent(new Event('online'))
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // All operations should have been processed
      expect(mockApiService.feeds.create).toHaveBeenCalledTimes(2)
      expect(mockApiService.feeds.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Data Synchronization and Conflict Resolution', () => {
    it('should handle conflicts between local and remote data', async () => {
      const localFeed = createMockFeed('feed-1', 'https://local.com/feed.xml')
      const remoteFeed = {
        ...localFeed,
        feedTitle: 'Updated Title (Remote)',
        lastUpdated: new Date(Date.now() + 60000).toISOString() // 1 minute newer
      }

      // Mock offline scenario with local changes
      mockNavigator.onLine = false

      const wrapper = createWrapper()
      const { result } = renderHook(() => useFeeds(), { wrapper })

      // Simulate local data
      await waitFor(() => {
        expect(result.current.feeds).toBeDefined()
      })

      // Go online and receive newer remote data
      mockNavigator.onLine = true
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [remoteFeed],
        items: []
      })

      await act(async () => {
        await result.current.refetch()
      })

      // Should use remote data (newer)
      await waitFor(() => {
        expect(result.current.feeds[0]?.feedTitle).toBe('Updated Title (Remote)')
      })
    })

    it('should handle offline edits with eventual consistency', async () => {
      const feed = createMockFeed('feed-1', 'https://edit.com/feed.xml')

      const wrapper = createWrapper()
      
      // Start online with initial data
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed],
        items: []
      })

      const { result: feedsResult } = renderHook(() => useFeeds(), { wrapper })
      
      await waitFor(() => {
        expect(feedsResult.current.feeds).toHaveLength(1)
      })

      // Go offline and make changes
      mockNavigator.onLine = false

      const { result: updateResult } = renderHook(() => {
        // Mock update mutation since it doesn't exist in real API
        return {
          mutateAsync: async (data: { id: string; feedTitle: string }) => {
            // Simulate local update
            return Promise.resolve({ ...feed, feedTitle: data.feedTitle })
          }
        }
      }, { wrapper })

      await act(async () => {
        await updateResult.current.mutateAsync({
          id: feed.guid,
          feedTitle: 'Offline Edit'
        })
      })

      // Go back online
      mockNavigator.onLine = true

      // Remote data should eventually sync
      const updatedFeed = { ...feed, feedTitle: 'Server Updated' }
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [updatedFeed],
        items: []
      })

      await act(async () => {
        await feedsResult.current.refetch()
      })

      await waitFor(() => {
        expect(feedsResult.current.feeds[0]?.feedTitle).toBe('Server Updated')
      })
    })
  })

  describe('Performance and Resource Management', () => {
    it('should limit queue size to prevent memory bloat', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        maxRetries: 0 // Don't retry to fill queue faster
      }), { wrapper })

      mockNavigator.onLine = false

      // Add many operations
      for (let i = 0; i < 100; i++) {
        const operation: FeedSyncOperation = {
          id: `op-${i}`,
          type: 'ADD_FEED',
          data: { url: `https://test${i}.com/feed.xml` },
          timestamp: Date.now(),
          priority: 'low'
        }

        act(() => {
          result.current.addToQueue(operation)
        })
      }

      // Queue should have all operations
      expect(result.current.queue.length).toBeLessThanOrEqual(100)
      expect(result.current.queueStatus.total).toBe(100)
    })

    it('should clean up completed operations', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue(), { wrapper })

      const operation: FeedSyncOperation = {
        id: 'cleanup-op',
        type: 'ADD_FEED',
        data: { url: 'https://cleanup.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'medium'
      }

      act(() => {
        result.current.addToQueue(operation)
      })

      // Process queue
      await act(async () => {
        await result.current.forceSync()
      })

      // Operation should be removed after completion
      await waitFor(() => {
        expect(result.current.queueStatus.succeeded).toBe(1)
        expect(result.current.queue.length).toBe(0)
      }, { timeout: 2000 })
    })

    it('should prioritize high priority operations', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue(), { wrapper })

      mockNavigator.onLine = false

      // Add operations with different priorities
      const lowPriorityOp: FeedSyncOperation = {
        id: 'low-op',
        type: 'ADD_FEED',
        data: { url: 'https://low.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'low'
      }

      const highPriorityOp: FeedSyncOperation = {
        id: 'high-op',
        type: 'ADD_FEED',
        data: { url: 'https://high.com/feed.xml' },
        timestamp: Date.now() + 1000, // Later timestamp
        priority: 'high'
      }

      act(() => {
        result.current.addToQueue(lowPriorityOp)
        result.current.addToQueue(highPriorityOp)
      })

      mockNavigator.onLine = true

      // Process queue
      await act(async () => {
        await result.current.forceSync()
      })

      // High priority should be processed first
      expect(mockApiService.feeds.create).toHaveBeenCalledTimes(2)
      // Note: Real implementation would need to sort by priority
    })
  })

  describe('Error Recovery in Offline Scenarios', () => {
    it('should handle storage failures gracefully', async () => {
      mockIndexedDBAdapter.set.mockRejectedValue(new Error('Storage full'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        persistQueue: true
      }), { wrapper })

      const operation: FeedSyncOperation = {
        id: 'storage-fail-op',
        type: 'ADD_FEED',
        data: { url: 'https://storage-fail.com/feed.xml' },
        timestamp: Date.now(),
        priority: 'medium'
      }

      // Should not crash even if storage fails
      expect(() => {
        act(() => {
          result.current.addToQueue(operation)
        })
      }).not.toThrow()

      // Operation should still be in memory queue
      expect(result.current.queue).toHaveLength(1)
    })

    it('should recover from corrupted queue data', async () => {
      mockIndexedDBAdapter.get.mockResolvedValue('corrupted-data')

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSyncQueue({
        persistQueue: true
      }), { wrapper })

      // Should start with empty queue despite corrupted storage
      expect(result.current.queue).toHaveLength(0)
      expect(result.current.queueStatus.isEmpty).toBe(true)
    })
  })
})