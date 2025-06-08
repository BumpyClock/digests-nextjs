import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { feedsKeys } from './use-feeds-query'
import type { FeedItem } from '@/types'

// Hook that detects new items by comparing successive query results
export const useFeedBackgroundSync = () => {
  const queryClient = useQueryClient()
  const [syncData, setSyncData] = useState({ hasNewItems: false, count: 0 })
  const previousItemsRef = useRef<Set<string>>(new Set())
  const hasInitialDataRef = useRef(false)
  
  useEffect(() => {
    // Subscribe to feeds query updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only listen to the feeds query
      if (event.type === 'updated' && 
          event.query.queryKey.toString() === feedsKeys.lists().toString()) {
        
        const queryState = event.query.state
        
        // Only process successful queries with data
        if (queryState.status === 'success' && queryState.data) {
          const currentItems = (queryState.data as { items?: FeedItem[] }).items || []
          const currentItemIds = new Set(currentItems.map(item => item.id))
          
          // If this is the first successful fetch, just store the baseline
          if (!hasInitialDataRef.current) {
            previousItemsRef.current = currentItemIds
            hasInitialDataRef.current = true
            setSyncData({ hasNewItems: false, count: 0 })
            return
          }
          
          // Compare against previous fetch to find genuinely new items
          const newItems = currentItems.filter(item => !previousItemsRef.current.has(item.id))
          
          if (newItems.length > 0) {
            setSyncData({ hasNewItems: true, count: newItems.length })
          } else {
            setSyncData({ hasNewItems: false, count: 0 })
          }
          
          // Update baseline for next comparison
          previousItemsRef.current = currentItemIds
        }
      }
    })
    
    return unsubscribe
  }, [queryClient])
  
  // Method to manually clear the notification (e.g., when user clicks refresh)
  const clearNotification = () => {
    setSyncData({ hasNewItems: false, count: 0 })
  }
  
  return { data: syncData, clearNotification }
}

