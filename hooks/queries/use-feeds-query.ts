import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workerService } from '@/services/worker-service'
import { useFeedStore } from '@/store/useFeedStore'
import type { Feed, FeedItem } from '@/types'

// Query Keys Factory
export const feedsKeys = {
  all: ['feeds'] as const,
  lists: () => [...feedsKeys.all, 'list'] as const,
  list: (filters: string[]) => [...feedsKeys.lists(), { filters }] as const,
  details: () => [...feedsKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedsKeys.details(), id] as const,
  sync: () => [...feedsKeys.all, 'sync'] as const,
} as const

// Main feeds query - fetches and refreshes all feeds
export const useFeedsQuery = () => {
  const queryClient = useQueryClient()
  const existingFeeds = useFeedStore(state => state.feeds)
  
  return useQuery({
    queryKey: feedsKeys.lists(),
    queryFn: async () => {
      // Get existing feeds from Zustand to refresh them
      const existingFeeds = useFeedStore.getState().feeds
      const feedUrls = existingFeeds.map(f => f.feedUrl)
      
      if (feedUrls.length === 0) {
        return { feeds: [], items: [] }
      }
      
      const result = await workerService.refreshFeeds(feedUrls)
      if (result.success) {
        // Sort items by date (newest first)
        const sortedItems = result.items.sort((a, b) => {
          const dateA = new Date(a.published || a.pubDate || 0).getTime()
          const dateB = new Date(b.published || b.pubDate || 0).getTime()
          return dateB - dateA // Newest first
        })
        return { feeds: result.feeds, items: sortedItems }
      }
      throw new Error(result.message || 'Failed to fetch feeds')
    },
    enabled: existingFeeds.length > 0, // Auto-enable when there are feeds to fetch
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes background refresh
    refetchIntervalInBackground: true,
    
    // Sync fresh data back to Zustand store
    onSuccess: (data) => {
      const store = useFeedStore.getState()
      store.setFeeds(data.feeds)
      store.setFeedItems(data.items)
    }
  })
}

// Add single feed mutation
export const useAddFeedMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (url: string) => {
      const result = await workerService.fetchFeeds(url)
      if (!result.success) {
        throw new Error(result.message || 'Failed to add feed')
      }
      return result
    },
    onSuccess: (data) => {
      // Get existing feeds from Zustand store to ensure we don't lose data
      const existingStore = useFeedStore.getState()
      const existingFeeds = existingStore.feeds || []
      const existingItems = existingStore.feedItems || []
      
      // Update the feeds query cache optimistically
      const updatedData = queryClient.setQueryData(feedsKeys.lists(), (old: any) => {
        // If no cache data, use existing store data as base
        const baseFeeds = old?.feeds || existingFeeds
        const baseItems = old?.items || existingItems
        
        // Deduplicate feeds and items
        const existingFeedUrls = new Set(baseFeeds.map((f: Feed) => f.feedUrl))
        const existingItemIds = new Set(baseItems.map((i: FeedItem) => i.id))
        
        const newFeeds = data.feeds.filter(f => !existingFeedUrls.has(f.feedUrl))
        const newItems = data.items.filter(i => !existingItemIds.has(i.id))
        
        return {
          feeds: [...baseFeeds, ...newFeeds],
          items: [...baseItems, ...newItems]
        }
      })
      
      // Sync updated data back to Zustand store
      if (updatedData) {
        const store = useFeedStore.getState()
        store.setFeeds(updatedData.feeds)
        store.setFeedItems(updatedData.items)
      }
    },
    onError: (error) => {
      console.error('Failed to add feed:', error)
    },
  })
}

// Remove feed mutation
export const useRemoveFeedMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (feedUrl: string) => {
      // This is optimistic - we don't need server call for removal
      return { feedUrl }
    },
    onMutate: async (feedUrl) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() })
      
      // Snapshot the previous value
      const previousFeeds = queryClient.getQueryData(feedsKeys.lists())
      
      // Optimistically update to remove the feed
      const updatedData = queryClient.setQueryData(feedsKeys.lists(), (old: any) => {
        if (!old) return old
        
        return {
          feeds: old.feeds.filter((f: Feed) => f.feedUrl !== feedUrl),
          items: old.items.filter((i: FeedItem) => i.feedUrl !== feedUrl)
        }
      })
      
      // Sync updated data back to Zustand store
      if (updatedData) {
        const store = useFeedStore.getState()
        store.setFeeds(updatedData.feeds)
        store.setFeedItems(updatedData.items)
      }
      
      return { previousFeeds }
    },
    onError: (err, feedUrl, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFeeds) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousFeeds)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() })
    },
  })
}

// Manual refresh mutation for user-triggered refreshes
export const useRefreshFeedsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const existingFeeds = useFeedStore.getState().feeds
      const feedUrls = existingFeeds.map(f => f.feedUrl)
      
      if (feedUrls.length === 0) {
        return { feeds: [], items: [] }
      }
      
      const result = await workerService.refreshFeeds(feedUrls)
      if (result.success) {
        // Sort items by date (newest first)
        const sortedItems = result.items.sort((a, b) => {
          const dateA = new Date(a.published || a.pubDate || 0).getTime()
          const dateB = new Date(b.published || b.pubDate || 0).getTime()
          return dateB - dateA // Newest first
        })
        return { feeds: result.feeds, items: sortedItems }
      }
      throw new Error(result.message || 'Failed to refresh feeds')
    },
    onSuccess: (data) => {
      // Update cache with fresh data
      queryClient.setQueryData(feedsKeys.lists(), data)
      
      // Sync fresh data back to Zustand store
      const store = useFeedStore.getState()
      store.setFeeds(data.feeds)
      store.setFeedItems(data.items)
    },
    onError: (error) => {
      console.error('Failed to refresh feeds:', error)
      // Refreshing state now handled by React Query (mutation.isPending)
    },
  })
}

// Batch add feeds mutation for OPML import
export const useBatchAddFeedsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (urls: string[]) => {
      // Use the worker's native ability to handle multiple URLs in one call
      // instead of making concurrent calls that cause race conditions
      const allFeeds: Feed[] = []
      const allItems: FeedItem[] = []
      let successfulCount = 0
      let failedCount = 0
      const failedUrls: string[] = []
      
      // Process URLs one by one to avoid worker race conditions
      for (const url of urls) {
        try {
          const result = await workerService.fetchFeeds(url)
          if (result.success) {
            allFeeds.push(...result.feeds)
            allItems.push(...result.items)
            successfulCount++
          } else {
            failedUrls.push(url)
            failedCount++
          }
        } catch (error) {
          console.error(`Failed to fetch feed ${url}:`, error)
          failedUrls.push(url)
          failedCount++
        }
      }
      
      return { 
        feeds: allFeeds, 
        items: allItems, 
        successfulCount,
        failedCount,
        failedUrls
      }
    },
    onSuccess: (data) => {
      // Get existing feeds from Zustand store to ensure we don't lose data
      const existingStore = useFeedStore.getState()
      const existingFeeds = existingStore.feeds || []
      const existingItems = existingStore.feedItems || []
      
      // Update the feeds query cache
      const updatedData = queryClient.setQueryData(feedsKeys.lists(), (old: any) => {
        // If no cache data, use existing store data as base
        const baseFeeds = old?.feeds || existingFeeds
        const baseItems = old?.items || existingItems
        
        // Deduplicate feeds and items
        const existingFeedUrls = new Set(baseFeeds.map((f: Feed) => f.feedUrl))
        const existingItemIds = new Set(baseItems.map((i: FeedItem) => i.id))
        
        const newFeeds = data.feeds.filter(f => !existingFeedUrls.has(f.feedUrl))
        const newItems = data.items.filter(i => !existingItemIds.has(i.id))
        
        return {
          feeds: [...baseFeeds, ...newFeeds],
          items: [...baseItems, ...newItems]
        }
      })
      
      // Sync updated data back to Zustand store
      if (updatedData) {
        const store = useFeedStore.getState()
        store.setFeeds(updatedData.feeds)
        store.setFeedItems(updatedData.items)
      }
    },
    onError: (error) => {
      console.error('Failed to batch add feeds:', error)
    },
  })
}