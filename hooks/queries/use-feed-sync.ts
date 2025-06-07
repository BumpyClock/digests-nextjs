import { useQuery, useQueryClient } from '@tanstack/react-query'
import { workerService } from '@/services/worker-service'
import { useFeedStore } from '@/store/useFeedStore'
import { feedsKeys } from './use-feeds-query'

// Background sync hook for checking updates
export const useFeedBackgroundSync = (intervalMs: number = 30 * 60 * 1000) => {
  const feeds = useFeedStore(state => state.feeds)
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: feedsKeys.sync(),
    queryFn: async () => {
      if (feeds.length === 0) {
        return { hasNewItems: false, count: 0, newItems: [] }
      }
      
      const feedUrls = feeds.map(f => f.feedUrl)
      const result = await workerService.checkForUpdates(feedUrls)
      
      if (result.success) {
        // Get existing items from React Query cache instead of Zustand
        const currentData = queryClient.getQueryData(feedsKeys.lists()) as { items?: any[] } | undefined
        const existingItems = currentData?.items || []
        const existingIds = new Set(existingItems.map(item => item.id))
        const newItems = result.items.filter(item => !existingIds.has(item.id))
        
        return {
          hasNewItems: newItems.length > 0,
          count: newItems.length,
          newItems,
          allItems: result.items,
          allFeeds: result.feeds
        }
      }
      
      return { hasNewItems: false, count: 0, newItems: [] }
    },
    refetchInterval: intervalMs,
    enabled: feeds.length > 0,
    staleTime: 0, // Always consider this query stale for background checks
    gcTime: 2 * 60 * 1000, // 2 minutes cache time for sync data
    refetchOnWindowFocus: false, // Don't refetch on focus for background sync
  })
}

// Hook for one-time update check (used by refresh button)
export const useCheckForUpdates = () => {
  const feeds = useFeedStore(state => state.feeds)
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: [...feedsKeys.sync(), 'manual'],
    queryFn: async () => {
      if (feeds.length === 0) {
        return { hasNewItems: false, count: 0 }
      }
      
      const feedUrls = feeds.map(f => f.feedUrl)
      const result = await workerService.checkForUpdates(feedUrls)
      
      if (result.success) {
        // Get existing items from React Query cache instead of Zustand
        const currentData = queryClient.getQueryData(feedsKeys.lists()) as { items?: any[] } | undefined
        const existingItems = currentData?.items || []
        const existingIds = new Set(existingItems.map(item => item.id))
        const newItems = result.items.filter(item => !existingIds.has(item.id))
        
        return {
          hasNewItems: newItems.length > 0,
          count: newItems.length
        }
      }
      
      return { hasNewItems: false, count: 0 }
    },
    enabled: false, // Only run when manually triggered
    staleTime: 0, // Always fresh when manually triggered
  })
}