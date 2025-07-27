// ABOUTME: React Query hook for single feed operations with caching and offline support
// ABOUTME: Provides detailed feed data with items and background refresh capabilities

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { apiService } from '@/services/api-service'
import type { Feed, FeedItem } from '@/types'
import { FEATURES } from '@/lib/feature-flags'
import { Logger } from '@/utils/logger'
import { feedsKeys, type FeedsQueryData } from './use-feeds'

// Single feed query data structure
export interface SingleFeedQueryData {
  feed: Feed
  items: FeedItem[]
  lastRefreshed: number
  isFromCache: boolean
}

/**
 * Get a single feed by ID with its items
 * Optimizes by checking the main feeds cache first before making API calls
 */
export const useFeed = (
  feedId: string, 
  options?: UseQueryOptions<SingleFeedQueryData>
) => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  
  return useQuery<SingleFeedQueryData>({
    queryKey: feedsKeys.detail(feedId),
    queryFn: async () => {
      Logger.debug('[useFeed] Fetching feed:', feedId)
      
      // Try to get from main feeds cache first for better performance
      const cachedData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      const cachedFeed = cachedData?.feeds.find(f => f.guid === feedId)
      
      if (cachedFeed && cachedData) {
        Logger.debug('[useFeed] Found feed in cache:', feedId)
        const feedItems = cachedData.items.filter(item => item.feedUrl === cachedFeed.feedUrl)
        
        return {
          feed: cachedFeed,
          items: feedItems,
          lastRefreshed: cachedData.lastFetched || Date.now(),
          isFromCache: true
        }
      }
      
      Logger.debug('[useFeed] Cache miss, fetching from API:', feedId)
      
      // Fallback to API if not in cache
      try {
        const feed = await apiService.feeds.getById(feedId)
        const result = await apiService.refreshFeeds([feed.feedUrl])
        
        return {
          feed: result.feeds[0] || feed,
          items: result.items,
          lastRefreshed: Date.now(),
          isFromCache: false
        }
      } catch (error) {
        Logger.error('[useFeed] Failed to fetch feed:', error)
        throw error
      }
    },
    enabled: !!feedId && isFeatureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: FEATURES.ENABLE_OFFLINE_SUPPORT ? 'offlineFirst' : 'online',
    ...options,
  })
}

/**
 * Get feed by URL instead of ID (useful for direct URL access)
 */
export const useFeedByUrl = (
  feedUrl: string,
  options?: UseQueryOptions<SingleFeedQueryData>
) => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  
  return useQuery<SingleFeedQueryData>({
    queryKey: [...feedsKeys.details(), 'byUrl', feedUrl],
    queryFn: async () => {
      Logger.debug('[useFeedByUrl] Fetching feed by URL:', feedUrl)
      
      // Try to get from main feeds cache first
      const cachedData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      const cachedFeed = cachedData?.feeds.find(f => f.feedUrl === feedUrl)
      
      if (cachedFeed && cachedData) {
        Logger.debug('[useFeedByUrl] Found feed in cache:', feedUrl)
        const feedItems = cachedData.items.filter(item => item.feedUrl === feedUrl)
        
        return {
          feed: cachedFeed,
          items: feedItems,
          lastRefreshed: cachedData.lastFetched || Date.now(),
          isFromCache: true
        }
      }
      
      Logger.debug('[useFeedByUrl] Cache miss, fetching from API:', feedUrl)
      
      // Fallback to direct feed fetch
      const result = await apiService.refreshFeeds([feedUrl])
      
      if (result.feeds.length === 0) {
        throw new Error(`Feed not found for URL: ${feedUrl}`)
      }
      
      return {
        feed: result.feeds[0],
        items: result.items,
        lastRefreshed: Date.now(),
        isFromCache: false
      }
    },
    enabled: !!feedUrl && isFeatureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    networkMode: FEATURES.ENABLE_OFFLINE_SUPPORT ? 'offlineFirst' : 'online',
    ...options,
  })
}

/**
 * Get items for a specific feed with pagination support
 */
export const useFeedItems = (
  feedUrl: string,
  options?: UseQueryOptions<FeedItem[]> & {
    limit?: number
    offset?: number
  }
) => {
  const queryClient = useQueryClient()
  const { limit, offset = 0, ...queryOptions } = options || {}
  
  return useQuery<FeedItem[]>({
    queryKey: feedsKeys.itemsByFeed(feedUrl),
    queryFn: async () => {
      Logger.debug('[useFeedItems] Fetching items for feed:', feedUrl)
      
      // Try to get from main cache first
      const cachedData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      if (cachedData) {
        let items = cachedData.items.filter(item => item.feedUrl === feedUrl)
        
        // Apply pagination if specified
        if (limit !== undefined) {
          items = items.slice(offset, offset + limit)
        }
        
        if (items.length > 0) {
          Logger.debug('[useFeedItems] Found items in cache:', items.length)
          return items
        }
      }
      
      // Fallback to API
      Logger.debug('[useFeedItems] Cache miss, fetching from API')
      const result = await apiService.refreshFeeds([feedUrl])
      let items = result.items
      
      // Apply pagination if specified
      if (limit !== undefined) {
        items = items.slice(offset, offset + limit)
      }
      
      return items
    },
    enabled: !!feedUrl && FEATURES.USE_REACT_QUERY_FEEDS,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...queryOptions,
  })
}

/**
 * Hook to prefetch a feed for better UX
 */
export const usePrefetchFeed = () => {
  const queryClient = useQueryClient()
  
  const prefetchFeed = async (feedId: string) => {
    Logger.debug('[usePrefetchFeed] Prefetching feed:', feedId)
    
    await queryClient.prefetchQuery({
      queryKey: feedsKeys.detail(feedId),
      queryFn: async () => {
        // Try cache first
        const cachedData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
        const cachedFeed = cachedData?.feeds.find(f => f.guid === feedId)
        
        if (cachedFeed && cachedData) {
          const feedItems = cachedData.items.filter(item => item.feedUrl === cachedFeed.feedUrl)
          return {
            feed: cachedFeed,
            items: feedItems,
            lastRefreshed: cachedData.lastFetched || Date.now(),
            isFromCache: true
          }
        }
        
        // Fallback to API
        const feed = await apiService.feeds.getById(feedId)
        const result = await apiService.refreshFeeds([feed.feedUrl])
        
        return {
          feed: result.feeds[0] || feed,
          items: result.items,
          lastRefreshed: Date.now(),
          isFromCache: false
        }
      },
      staleTime: 5 * 60 * 1000,
    })
  }
  
  const prefetchFeedByUrl = async (feedUrl: string) => {
    Logger.debug('[usePrefetchFeed] Prefetching feed by URL:', feedUrl)
    
    await queryClient.prefetchQuery({
      queryKey: [...feedsKeys.details(), 'byUrl', feedUrl],
      queryFn: async () => {
        const result = await apiService.refreshFeeds([feedUrl])
        
        if (result.feeds.length === 0) {
          throw new Error(`Feed not found for URL: ${feedUrl}`)
        }
        
        return {
          feed: result.feeds[0],
          items: result.items,
          lastRefreshed: Date.now(),
          isFromCache: false
        }
      },
      staleTime: 5 * 60 * 1000,
    })
  }
  
  return {
    prefetchFeed,
    prefetchFeedByUrl,
  }
}

/**
 * Hook to invalidate and refetch feed data
 */
export const useInvalidateFeed = () => {
  const queryClient = useQueryClient()
  
  const invalidateFeed = async (feedId: string) => {
    Logger.debug('[useInvalidateFeed] Invalidating feed:', feedId)
    
    // Invalidate specific feed
    await queryClient.invalidateQueries({
      queryKey: feedsKeys.detail(feedId)
    })
    
    // Also invalidate the main feeds list to ensure consistency
    await queryClient.invalidateQueries({
      queryKey: feedsKeys.lists()
    })
  }
  
  const invalidateFeedByUrl = async (feedUrl: string) => {
    Logger.debug('[useInvalidateFeed] Invalidating feed by URL:', feedUrl)
    
    // Invalidate by URL queries
    await queryClient.invalidateQueries({
      queryKey: [...feedsKeys.details(), 'byUrl', feedUrl]
    })
    
    // Invalidate items for this feed
    await queryClient.invalidateQueries({
      queryKey: feedsKeys.itemsByFeed(feedUrl)
    })
    
    // Also invalidate the main feeds list
    await queryClient.invalidateQueries({
      queryKey: feedsKeys.lists()
    })
  }
  
  const invalidateAllFeeds = async () => {
    Logger.debug('[useInvalidateFeed] Invalidating all feed queries')
    
    await queryClient.invalidateQueries({
      queryKey: feedsKeys.all
    })
  }
  
  return {
    invalidateFeed,
    invalidateFeedByUrl,
    invalidateAllFeeds,
  }
}