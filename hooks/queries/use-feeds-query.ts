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
        return { feeds: result.feeds, items: result.items }
      }
      throw new Error(result.message || 'Failed to fetch feeds')
    },
    enabled: false, // Start disabled, enable manually when needed
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
      // Update the feeds query cache optimistically
      queryClient.setQueryData(feedsKeys.lists(), (old: any) => {
        if (!old) return { feeds: data.feeds, items: data.items }
        
        // Deduplicate feeds and items
        const existingFeedUrls = new Set(old.feeds.map((f: Feed) => f.feedUrl))
        const existingItemIds = new Set(old.items.map((i: FeedItem) => i.id))
        
        const newFeeds = data.feeds.filter(f => !existingFeedUrls.has(f.feedUrl))
        const newItems = data.items.filter(i => !existingItemIds.has(i.id))
        
        return {
          feeds: [...old.feeds, ...newFeeds],
          items: [...old.items, ...newItems]
        }
      })
      
      // Also sync to Zustand for client state dependencies
      const { setFeeds, setFeedItems, sortFeedItemsByDate } = useFeedStore.getState()
      const currentState = useFeedStore.getState()
      const mergedFeeds = [...currentState.feeds, ...data.feeds]
      const mergedItems = sortFeedItemsByDate([...currentState.feedItems, ...data.items])
      
      setFeeds(mergedFeeds)
      setFeedItems(mergedItems)
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
      queryClient.setQueryData(feedsKeys.lists(), (old: any) => {
        if (!old) return old
        
        return {
          feeds: old.feeds.filter((f: Feed) => f.feedUrl !== feedUrl),
          items: old.items.filter((i: FeedItem) => i.feedUrl !== feedUrl)
        }
      })
      
      // Update Zustand immediately
      useFeedStore.getState().removeFeed(feedUrl)
      
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
        return { feeds: result.feeds, items: result.items }
      }
      throw new Error(result.message || 'Failed to refresh feeds')
    },
    onSuccess: (data) => {
      // Update cache with fresh data
      queryClient.setQueryData(feedsKeys.lists(), data)
      
      // Sync to Zustand
      const { setFeeds, setFeedItems, sortFeedItemsByDate } = useFeedStore.getState()
      const sortedItems = sortFeedItemsByDate(data.items)
      
      setFeeds(data.feeds)
      setFeedItems(sortedItems)
      
      // Update metadata
      useFeedStore.getState().setRefreshing(false)
      useFeedStore.setState({ lastRefreshed: Date.now() })
    },
    onError: (error) => {
      console.error('Failed to refresh feeds:', error)
      useFeedStore.getState().setRefreshing(false)
    },
    onMutate: () => {
      // Set refreshing state
      useFeedStore.getState().setRefreshing(true)
    },
  })
}