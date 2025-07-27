// ABOUTME: React Query mutations for feed operations with optimistic updates
// ABOUTME: Provides add, update, delete mutations with error recovery and offline sync

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { apiService, CreateFeedDto, UpdateFeedDto } from '@/services/api-service'
import { useFeedStore } from '@/store/useFeedStore'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import type { Feed, FeedItem } from '@/types'
import { FEATURES } from '@/lib/feature-flags'
import { Logger } from '@/utils/logger'
import { feedsKeys, type FeedsQueryData } from './use-feeds'
import { toast } from '@/hooks/use-toast'

// Mutation operation types for offline sync
export type FeedMutationType = 'ADD_FEED' | 'UPDATE_FEED' | 'DELETE_FEED' | 'REFRESH_FEED'

export interface FeedMutationOperation {
  type: FeedMutationType
  data: any
  timestamp: number
  id: string
}

/**
 * Add feed mutation with optimistic updates and offline support
 */
export const useAddFeed = (options?: UseMutationOptions<Feed, Error, CreateFeedDto>) => {
  const queryClient = useQueryClient()
  const { addToQueue } = useSyncQueue()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  const isOfflineEnabled = FEATURES.ENABLE_OFFLINE_SUPPORT
  
  return useMutation({
    mutationFn: async (feedDto: CreateFeedDto) => {
      Logger.debug('[useAddFeed] Adding feed:', feedDto.url)
      
      // Add to offline queue if offline support is enabled
      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: 'ADD_FEED',
          data: feedDto,
          timestamp: Date.now(),
          id: crypto.randomUUID()
        }
        addToQueue(operation)
      }
      
      return await apiService.feeds.create(feedDto)
    },
    onMutate: async (feedDto) => {
      if (!isFeatureEnabled) return
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      
      // Optimistically update with placeholder
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old
        
        const optimisticFeed: Feed = {
          type: 'feed',
          guid: `temp-${Date.now()}`,
          status: 'pending',
          siteTitle: feedDto.url,
          feedTitle: 'Loading...',
          feedUrl: feedDto.url,
          description: '',
          link: feedDto.url,
          lastUpdated: new Date().toISOString(),
          lastRefreshed: new Date().toISOString(),
          published: new Date().toISOString(),
          author: null,
          language: '',
          favicon: '',
          categories: '',
        }
        
        return {
          ...old,
          feeds: [...old.feeds, optimisticFeed],
        }
      })
      
      return { previousData }
    },
    onSuccess: async (newFeed, variables, context) => {
      Logger.debug('[useAddFeed] Successfully added feed:', newFeed.feedUrl)
      
      if (isFeatureEnabled) {
        try {
          // Fetch feed items immediately
          const result = await apiService.refreshFeeds([newFeed.feedUrl])
          
          // Update cache with real data
          queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
            if (!old) return { feeds: result.feeds, items: result.items, lastFetched: Date.now() }
            
            // Remove optimistic feed and add real one
            const feeds = old.feeds.filter(f => !f.guid.startsWith('temp-'))
            const existingFeedUrls = new Set(feeds.map(f => f.feedUrl))
            const existingItemIds = new Set(old.items.map(i => i.id))
            
            const newFeeds = result.feeds.filter(f => !existingFeedUrls.has(f.feedUrl))
            const newItems = result.items.filter(i => !existingItemIds.has(i.id))
            
            return {
              feeds: [...feeds, ...newFeeds],
              items: [...old.items, ...newItems].sort((a, b) => {
                const dateA = new Date(a.published || a.pubDate || 0).getTime()
                const dateB = new Date(b.published || b.pubDate || 0).getTime()
                return dateB - dateA
              }),
              lastFetched: Date.now()
            }
          })
          
          toast({
            title: "Feed added successfully",
            description: `${newFeed.feedTitle || newFeed.siteTitle} has been added to your feeds.`,
          })
        } catch (error) {
          Logger.error('[useAddFeed] Failed to fetch feed items:', error)
          toast({
            title: "Feed added with warning",
            description: "Feed was added but some items may not be available yet.",
            variant: "destructive",
          })
        }
      } else {
        // Sync with Zustand
        const store = useFeedStore.getState()
        try {
          const result = await apiService.refreshFeeds([newFeed.feedUrl])
          store.setFeeds([...store.feeds, ...result.feeds])
          store.setFeedItems([...store.feedItems, ...result.items])
        } catch (error) {
          Logger.error('[useAddFeed] Failed to sync with Zustand:', error)
        }
      }
    },
    onError: (error, variables, context) => {
      Logger.error('[useAddFeed] Failed to add feed:', error)
      
      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData)
      }
      
      toast({
        title: "Failed to add feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      // Always invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() })
    },
    ...options,
  })
}

/**
 * Update feed mutation with optimistic updates
 */
export const useUpdateFeed = (options?: UseMutationOptions<Feed, Error, { id: string; data: UpdateFeedDto }>) => {
  const queryClient = useQueryClient()
  const { addToQueue } = useSyncQueue()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  const isOfflineEnabled = FEATURES.ENABLE_OFFLINE_SUPPORT
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFeedDto }) => {
      Logger.debug('[useUpdateFeed] Updating feed:', id, data)
      
      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: 'UPDATE_FEED',
          data: { id, ...data },
          timestamp: Date.now(),
          id: crypto.randomUUID()
        }
        addToQueue(operation)
      }
      
      // Note: Current API doesn't support updates, so we handle it client-side
      return { id, ...data } as Feed
    },
    onMutate: async ({ id, data }) => {
      if (!isFeatureEnabled) return
      
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() })
      
      const previousData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      
      // Optimistically update
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old
        
        return {
          ...old,
          feeds: old.feeds.map(feed =>
            feed.guid === id
              ? { ...feed, ...data }
              : feed
          ),
        }
      })
      
      return { previousData }
    },
    onSuccess: (updatedFeed, variables) => {
      Logger.debug('[useUpdateFeed] Successfully updated feed:', variables.id)
      
      toast({
        title: "Feed updated",
        description: "Feed settings have been updated successfully.",
      })
    },
    onError: (error, variables, context) => {
      Logger.error('[useUpdateFeed] Failed to update feed:', error)
      
      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData)
      }
      
      toast({
        title: "Failed to update feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() })
    },
    ...options,
  })
}

/**
 * Delete feed mutation with optimistic updates
 */
export const useDeleteFeed = (options?: UseMutationOptions<string, Error, string>) => {
  const queryClient = useQueryClient()
  const { addToQueue } = useSyncQueue()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  const isOfflineEnabled = FEATURES.ENABLE_OFFLINE_SUPPORT
  
  return useMutation({
    mutationFn: async (feedUrl: string) => {
      Logger.debug('[useDeleteFeed] Deleting feed:', feedUrl)
      
      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: 'DELETE_FEED',
          data: { feedUrl },
          timestamp: Date.now(),
          id: crypto.randomUUID()
        }
        addToQueue(operation)
      }
      
      // Find the feed to get its ID
      const feeds = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())?.feeds || []
      const feed = feeds.find(f => f.feedUrl === feedUrl)
      if (feed) {
        await apiService.feeds.delete(feed.guid)
      }
      return feedUrl
    },
    onMutate: async (feedUrl) => {
      if (!isFeatureEnabled) return
      
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() })
      
      const previousData = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())
      
      // Optimistically remove
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old
        
        return {
          ...old,
          feeds: old.feeds.filter(f => f.feedUrl !== feedUrl),
          items: old.items.filter(i => i.feedUrl !== feedUrl),
        }
      })
      
      return { previousData }
    },
    onSuccess: (feedUrl) => {
      Logger.debug('[useDeleteFeed] Successfully deleted feed:', feedUrl)
      
      if (!isFeatureEnabled) {
        // Sync with Zustand
        const store = useFeedStore.getState()
        store.removeFeedFromCache(feedUrl)
      }
      
      toast({
        title: "Feed removed",
        description: "Feed has been removed from your list.",
      })
    },
    onError: (error, variables, context) => {
      Logger.error('[useDeleteFeed] Failed to delete feed:', error)
      
      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData)
      }
      
      toast({
        title: "Failed to remove feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() })
    },
    ...options,
  })
}

/**
 * Refresh single feed mutation
 */
export const useRefreshFeed = (options?: UseMutationOptions<{ feedId: string; items: FeedItem[] }, Error, string>) => {
  const queryClient = useQueryClient()
  const { addToQueue } = useSyncQueue()
  const isOfflineEnabled = FEATURES.ENABLE_OFFLINE_SUPPORT
  
  return useMutation({
    mutationFn: async (feedId: string) => {
      Logger.debug('[useRefreshFeed] Refreshing feed:', feedId)
      
      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: 'REFRESH_FEED',
          data: { feedId },
          timestamp: Date.now(),
          id: crypto.randomUUID()
        }
        addToQueue(operation)
      }
      
      const items = await apiService.feeds.refresh(feedId)
      return { feedId, items }
    },
    onSuccess: ({ feedId, items }) => {
      Logger.debug('[useRefreshFeed] Successfully refreshed feed:', feedId)
      
      // Update the feed's items in the cache
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old
        
        const feed = old.feeds.find(f => f.guid === feedId)
        if (!feed) return old
        
        // Remove old items for this feed and add new ones
        const otherItems = old.items.filter(i => i.feedUrl !== feed.feedUrl)
        
        return {
          ...old,
          items: [...otherItems, ...items].sort((a, b) => {
            const dateA = new Date(a.published || a.pubDate || 0).getTime()
            const dateB = new Date(b.published || b.pubDate || 0).getTime()
            return dateB - dateA
          }),
          lastFetched: Date.now()
        }
      })
      
      toast({
        title: "Feed refreshed",
        description: "Latest articles have been fetched.",
      })
    },
    onError: (error) => {
      Logger.error('[useRefreshFeed] Failed to refresh feed:', error)
      
      toast({
        title: "Failed to refresh feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    ...options,
  })
}

/**
 * Refresh all feeds mutation
 */
export const useRefreshAllFeeds = (options?: UseMutationOptions<{ feeds: Feed[]; items: FeedItem[] }, Error, void>) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      Logger.debug('[useRefreshAllFeeds] Refreshing all feeds')
      
      const feeds = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())?.feeds || []
      const feedUrls = feeds.map(f => f.feedUrl)
      
      if (feedUrls.length === 0) {
        return { feeds: [], items: [] }
      }
      
      const result = await apiService.refreshFeeds(feedUrls)
      
      // Sort items by date
      const sortedItems = result.items.sort((a, b) => {
        const dateA = new Date(a.published || a.pubDate || 0).getTime()
        const dateB = new Date(b.published || b.pubDate || 0).getTime()
        return dateB - dateA
      })
      
      return { feeds: result.feeds, items: sortedItems }
    },
    onSuccess: (data) => {
      Logger.debug('[useRefreshAllFeeds] Successfully refreshed all feeds')
      
      // Update cache with fresh data
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), {
        feeds: data.feeds,
        items: data.items,
        lastFetched: Date.now()
      })
      
      toast({
        title: "All feeds refreshed",
        description: `Updated ${data.feeds.length} feeds with latest articles.`,
      })
    },
    onError: (error) => {
      Logger.error('[useRefreshAllFeeds] Failed to refresh all feeds:', error)
      
      toast({
        title: "Failed to refresh feeds",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    ...options,
  })
}

/**
 * Batch add feeds mutation (for OPML import)
 */
export const useBatchAddFeeds = (options?: UseMutationOptions<{
  feeds: Feed[];
  items: FeedItem[];
  successfulCount: number;
  failedCount: number;
  failedUrls: string[];
}, Error, string[]>) => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS
  
  return useMutation({
    mutationFn: async (urls: string[]) => {
      Logger.debug('[useBatchAddFeeds] Adding feeds:', urls.length)
      
      const results = {
        feeds: [] as Feed[],
        items: [] as FeedItem[],
        successfulCount: 0,
        failedCount: 0,
        failedUrls: [] as string[],
      }
      
      // Process URLs sequentially to avoid overwhelming the API
      for (const url of urls) {
        try {
          const feed = await apiService.feeds.create({ url })
          const feedData = await apiService.refreshFeeds([feed.feedUrl])
          
          results.feeds.push(...feedData.feeds)
          results.items.push(...feedData.items)
          results.successfulCount++
        } catch (error) {
          Logger.error(`[useBatchAddFeeds] Failed to add feed ${url}:`, error)
          results.failedUrls.push(url)
          results.failedCount++
        }
      }
      
      return results
    },
    onSuccess: (data) => {
      Logger.debug('[useBatchAddFeeds] Batch add completed:', {
        successful: data.successfulCount,
        failed: data.failedCount
      })
      
      if (isFeatureEnabled) {
        // Update cache
        queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
          if (!old) return { feeds: data.feeds, items: data.items, lastFetched: Date.now() }
          
          // Deduplicate
          const existingFeedUrls = new Set(old.feeds.map(f => f.feedUrl))
          const existingItemIds = new Set(old.items.map(i => i.id))
          
          const newFeeds = data.feeds.filter(f => !existingFeedUrls.has(f.feedUrl))
          const newItems = data.items.filter(i => !existingItemIds.has(i.id))
          
          return {
            feeds: [...old.feeds, ...newFeeds],
            items: [...old.items, ...newItems],
            lastFetched: Date.now()
          }
        })
      } else {
        // Sync with Zustand
        const store = useFeedStore.getState()
        store.setFeeds([...store.feeds, ...data.feeds])
        store.setFeedItems([...store.feedItems, ...data.items])
      }
      
      // Show success/failure summary
      if (data.failedCount > 0) {
        toast({
          title: "Batch import completed with warnings",
          description: `${data.successfulCount} feeds added successfully, ${data.failedCount} failed.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Batch import completed",
          description: `Successfully added ${data.successfulCount} feeds.`,
        })
      }
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() })
    },
    onError: (error) => {
      Logger.error('[useBatchAddFeeds] Batch add failed:', error)
      
      toast({
        title: "Batch import failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
    ...options,
  })
}