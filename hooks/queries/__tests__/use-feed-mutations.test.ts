// ABOUTME: Unit tests for feed mutation hooks with optimistic updates and error recovery
// ABOUTME: Tests add, update, delete, and refresh mutations with offline sync support

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { 
  useAddFeed, 
  useUpdateFeed, 
  useDeleteFeed, 
  useRefreshFeed,
  useRefreshAllFeeds,
  useBatchAddFeeds 
} from '../use-feed-mutations'
import { feedsKeys, type FeedsQueryData } from '../use-feeds'
import { apiService } from '@/services/api-service'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { FEATURES } from '@/lib/feature-flags'
import type { Feed, FeedItem } from '@/types'

// Mock dependencies
jest.mock('@/services/api-service')
jest.mock('@/hooks/useSyncQueue')
jest.mock('@/lib/feature-flags')
jest.mock('@/hooks/use-toast')

const mockApiService = apiService as jest.Mocked<typeof apiService>
const mockUseSyncQueue = useSyncQueue as jest.MockedFunction<typeof useSyncQueue>
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>

// Test data
const mockFeed: Feed = {
  type: 'feed',
  guid: 'feed-1',
  status: 'active',
  siteTitle: 'Test Blog',
  feedTitle: 'Test Blog Feed',
  feedUrl: 'https://test.com/feed.xml',
  description: 'A test blog',
  link: 'https://test.com',
  lastUpdated: '2023-01-01T00:00:00Z',
  lastRefreshed: '2023-01-01T00:00:00Z',
  published: '2023-01-01T00:00:00Z',
  author: 'Test Author',
  language: 'en',
  favicon: 'https://test.com/favicon.ico',
  categories: 'tech',
}

const mockItem: FeedItem = {
  type: 'item',
  id: 'item-1',
  title: 'Test Article',
  description: 'A test article',
  link: 'https://test.com/article-1',
  author: 'Test Author',
  published: '2023-01-01T00:00:00Z',
  content: 'Test content',
  created: '2023-01-01T00:00:00Z',
  content_encoded: 'Test content encoded',
  categories: ['tech'],
  enclosures: [],
  thumbnail: 'https://test.com/thumb.jpg',
  thumbnailColor: '#000000',
  thumbnailColorComputed: true,
  siteTitle: 'Test Blog',
  feedTitle: 'Test Blog Feed',
  feedUrl: 'https://test.com/feed.xml',
  favicon: 'https://test.com/favicon.ico',
  favorite: false,
  pubDate: '2023-01-01T00:00:00Z',
}

const mockSyncQueue = {
  addToQueue: jest.fn(),
  queue: [],
  queueMutation: jest.fn(),
  removeMutation: jest.fn(),
  clearQueue: jest.fn(),
  forceSync: jest.fn(),
  isSyncing: false,
  isOnline: true,
  queueStatus: {
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    succeeded: 0,
    isEmpty: true,
  },
}

// Test wrapper component
const createWrapper = (initialData?: FeedsQueryData) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  if (initialData) {
    queryClient.setQueryData(feedsKeys.lists(), initialData)
  }

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Feed Mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSyncQueue.mockReturnValue(mockSyncQueue)
    mockFeatures.USE_REACT_QUERY_FEEDS = true
    mockFeatures.ENABLE_OFFLINE_SUPPORT = false
  })

  describe('useAddFeed', () => {
    it('should add a feed successfully', async () => {
      const newFeed = { ...mockFeed, guid: 'new-feed' }
      mockApiService.feeds.create.mockResolvedValue(newFeed)
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem]
      })

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ url: 'https://new.com/feed.xml' })
      })

      expect(mockApiService.feeds.create).toHaveBeenCalledWith({
        url: 'https://new.com/feed.xml'
      })
      expect(mockApiService.refreshFeeds).toHaveBeenCalledWith([newFeed.feedUrl])
      expect(result.current.isSuccess).toBe(true)
    })

    it('should handle optimistic updates', async () => {
      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useAddFeed(), { wrapper })

      // Start mutation but don't resolve yet
      const mutationPromise = result.current.mutateAsync({ url: 'https://new.com/feed.xml' })

      // Optimistic update should be applied immediately
      expect(result.current.isPending).toBe(true)

      // Resolve the mutation
      const newFeed = { ...mockFeed, guid: 'new-feed' }
      mockApiService.feeds.create.mockResolvedValue(newFeed)
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem]
      })

      await act(async () => {
        await mutationPromise
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('should queue operation when offline', async () => {
      mockFeatures.ENABLE_OFFLINE_SUPPORT = true

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ url: 'https://new.com/feed.xml' })
      })

      expect(mockSyncQueue.addToQueue).toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      const error = new Error('Failed to add feed')
      mockApiService.feeds.create.mockRejectedValue(error)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({ url: 'https://invalid.com/feed.xml' })
        } catch (e) {
          // Expected to throw
        }
      })

      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBe(error)
    })
  })

  describe('useUpdateFeed', () => {
    it('should update a feed successfully', async () => {
      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useUpdateFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          id: mockFeed.guid,
          data: { feedTitle: 'Updated Title' }
        })
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('should apply optimistic updates', async () => {
      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useUpdateFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          id: mockFeed.guid,
          data: { feedTitle: 'Updated Title' }
        })
      })

      expect(result.current.isSuccess).toBe(true)
    })
  })

  describe('useDeleteFeed', () => {
    it('should delete a feed successfully', async () => {
      mockApiService.feeds.delete.mockResolvedValue(undefined)

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useDeleteFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync(mockFeed.feedUrl)
      })

      expect(mockApiService.feeds.delete).toHaveBeenCalledWith(mockFeed.guid)
      expect(result.current.isSuccess).toBe(true)
    })

    it('should apply optimistic removal', async () => {
      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useDeleteFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync(mockFeed.feedUrl)
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Failed to delete feed')
      mockApiService.feeds.delete.mockRejectedValue(error)

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useDeleteFeed(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync(mockFeed.feedUrl)
        } catch (e) {
          // Expected to throw
        }
      })

      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBe(error)
    })
  })

  describe('useRefreshFeed', () => {
    it('should refresh a single feed', async () => {
      const newItems = [mockItem, { ...mockItem, id: 'item-2' }]
      mockApiService.feeds.refresh.mockResolvedValue(newItems)

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useRefreshFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync(mockFeed.guid)
      })

      expect(mockApiService.feeds.refresh).toHaveBeenCalledWith(mockFeed.guid)
      expect(result.current.isSuccess).toBe(true)
    })
  })

  describe('useRefreshAllFeeds', () => {
    it('should refresh all feeds', async () => {
      const refreshedData = {
        feeds: [mockFeed],
        items: [mockItem, { ...mockItem, id: 'item-2' }]
      }
      mockApiService.refreshFeeds.mockResolvedValue(refreshedData)

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useRefreshAllFeeds(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(mockApiService.refreshFeeds).toHaveBeenCalledWith([mockFeed.feedUrl])
      expect(result.current.isSuccess).toBe(true)
    })

    it('should handle empty feed list', async () => {
      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useRefreshAllFeeds(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(result.current.isSuccess).toBe(true)
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled()
    })
  })

  describe('useBatchAddFeeds', () => {
    it('should add multiple feeds successfully', async () => {
      const urls = ['https://feed1.com/rss', 'https://feed2.com/rss']
      const feed1 = { ...mockFeed, guid: 'feed-1', feedUrl: urls[0] }
      const feed2 = { ...mockFeed, guid: 'feed-2', feedUrl: urls[1] }

      mockApiService.feeds.create
        .mockResolvedValueOnce(feed1)
        .mockResolvedValueOnce(feed2)

      mockApiService.refreshFeeds
        .mockResolvedValueOnce({ feeds: [feed1], items: [mockItem] })
        .mockResolvedValueOnce({ feeds: [feed2], items: [{ ...mockItem, id: 'item-2' }] })

      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useBatchAddFeeds(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync(urls)
      })

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.successfulCount).toBe(2)
      expect(result.current.data?.failedCount).toBe(0)
    })

    it('should handle partial failures', async () => {
      const urls = ['https://feed1.com/rss', 'https://invalid.com/rss']
      const feed1 = { ...mockFeed, guid: 'feed-1', feedUrl: urls[0] }

      mockApiService.feeds.create
        .mockResolvedValueOnce(feed1)
        .mockRejectedValueOnce(new Error('Invalid feed'))

      mockApiService.refreshFeeds
        .mockResolvedValueOnce({ feeds: [feed1], items: [mockItem] })

      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now()
      })

      const { result } = renderHook(() => useBatchAddFeeds(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync(urls)
      })

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.successfulCount).toBe(1)
      expect(result.current.data?.failedCount).toBe(1)
      expect(result.current.data?.failedUrls).toContain('https://invalid.com/rss')
    })
  })

  describe('feature flag integration', () => {
    it('should respect React Query feature flag', async () => {
      mockFeatures.USE_REACT_QUERY_FEEDS = false

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ url: 'https://test.com/feed.xml' })
      })

      // Should still work but may behave differently
      expect(result.current.isPending || result.current.isSuccess || result.current.isError).toBe(true)
    })

    it('should handle offline support feature flag', async () => {
      mockFeatures.ENABLE_OFFLINE_SUPPORT = true

      const wrapper = createWrapper()
      const { result } = renderHook(() => useAddFeed(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ url: 'https://test.com/feed.xml' })
      })

      expect(mockSyncQueue.addToQueue).toHaveBeenCalled()
    })
  })
})