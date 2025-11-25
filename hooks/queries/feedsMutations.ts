import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { workerService } from '@/services/worker-service'
import { useFeedStore } from '@/store/useFeedStore'
import type { Feed, FeedItem } from '@/types'
import { feedsKeys } from './feedsKeys'
import { sortByDateDesc } from '@/utils/selectors'

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
      // Invalidate all feed list queries so subscription-dependent keys refresh
      queryClient.invalidateQueries({ queryKey: feedsKeys.all })
      // Keep store subscriptions in sync for key computation
      const store = useFeedStore.getState()
      store.setFeeds([...(store.feeds || []), ...data.feeds])
    },
    onError: (error) => {
      console.error('Failed to add feed:', error)
    },
  })
}

// Remove feed mutation
export const useRemoveFeedMutation = () => {
  const queryClient = useQueryClient()
  
  type CacheData = { feeds: Feed[]; items: FeedItem[] }

  return useMutation<{ feedUrl: string }, Error, string, { previousFeeds?: CacheData; key: QueryKey }>({
    mutationFn: async (feedUrl: string) => {
      // This is optimistic - we don't need server call for removal
      return { feedUrl }
    },
    onMutate: async (feedUrl) => {
      // Cancel any outgoing refetches for any feeds list
      await queryClient.cancelQueries({ queryKey: feedsKeys.all })

      // Snapshot the previous cache for the current subscription set
      const st = useFeedStore.getState()
      const urls: string[] = (st.feeds || []).map((f: Feed) => f.feedUrl)
      const key = feedsKeys.list(urls)
      const previousFeeds = queryClient.getQueryData<CacheData>(key)

      // Optimistically update for the current key
      const updatedData = queryClient.setQueryData<CacheData>(key, (old) => {
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
      }

      return { previousFeeds, key }
    },
    onError: (_err, _feedUrl, context) => {
      // If the mutation fails, roll back
      if (context?.previousFeeds && context?.key) {
        queryClient.setQueryData<CacheData>(context.key, context.previousFeeds)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: feedsKeys.all })
    },
  })
}

// Manual refresh mutation for user-triggered refreshes
export const useRefreshFeedsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation<{ feeds: Feed[]; items: FeedItem[] }, Error>({
    mutationFn: async () => {
      const st = useFeedStore.getState()
      const feedUrls: string[] = (st.feeds || []).map((f: Feed) => f.feedUrl)
      
      if (feedUrls.length === 0) {
        return { feeds: [], items: [] }
      }
      
      const result = await workerService.refreshFeeds(feedUrls)
      if (result.success) {
        // Sort items by date (newest first) without mutation
        const sortedItems = [...result.items].sort(sortByDateDesc)
        return { feeds: result.feeds, items: sortedItems }
      }
      throw new Error(result.message || 'Failed to refresh feeds')
    },
    onSuccess: (data) => {
      // Update cache for the current subscription key
      const st = useFeedStore.getState()
      const urls: string[] = (st.feeds || []).map((f: Feed) => f.feedUrl)
      queryClient.setQueryData<{ feeds: Feed[]; items: FeedItem[] }>(feedsKeys.list(urls), data)

      // Sync fresh data back to Zustand store
      const store = useFeedStore.getState()
      store.setFeeds(data.feeds)
    },
    onError: (error) => {
      console.error('Failed to refresh feeds:', error)
    },
  })
}

// Batch add feeds mutation for OPML import
export const useBatchAddFeedsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (urls: string[]) => {
      // Use the worker's native ability to handle multiple URLs in one call
      const allFeeds: Feed[] = []
      const allItems: FeedItem[] = []
      let successfulCount = 0
      let failedCount = 0
      const failedUrls: string[] = []
      
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
      // Invalidate all feeds lists to re-compute keys and refetch
      queryClient.invalidateQueries({ queryKey: feedsKeys.all })
      const store = useFeedStore.getState()
      store.setFeeds([...(store.feeds || []), ...data.feeds])
    },
    onError: (error) => {
      console.error('Failed to batch add feeds:', error)
    },
  })
}
