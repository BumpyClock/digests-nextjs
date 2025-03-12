// store/useFeedStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"
import { useState, useEffect } from "react"

import type { Feed, FeedItem } from "@/types"
import { workerService } from "@/services/worker-service"

/** 
 * The Zustand store shape with web worker integration
 */
interface FeedState {
  feeds: Feed[]
  feedItems: FeedItem[]
  loading: boolean
  refreshing: boolean
  initialized: boolean
  lastRefreshed: number | null
  hydrated: boolean

  // Setters
  setFeeds: (feeds: Feed[]) => void
  setFeedItems: (items: FeedItem[]) => void
  setHydrated: (state: boolean) => void

  // Actions
  addFeed: (url: string) => Promise<{ success: boolean; message: string }>
  refreshFeeds: () => Promise<void>
  sortFeedItemsByDate: (items: FeedItem[]) => FeedItem[]
  removeFeed: (feedUrl: string) => void
  setInitialized: (value: boolean) => void
  shouldRefresh: () => boolean
  addFeeds: (urls: string[]) => Promise<{ 
    successful: Array<{ url: string, message: string }>, 
    failed: Array<{ url: string, message: string }> 
  }>
}

// Add hydration flag at top of file
let hydrated = false

// Helper function to normalize URLs for comparison
const normalizeUrl = (url: string): string => {
  try {
    // Remove protocol and any trailing slashes
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  } catch {
    return url;
  }
};

/**
 * Create a Zustand store with persist middleware, storing data in IndexedDB.
 * Now uses the web worker service for API calls.
 */
export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      // === INITIAL STATE ===
      feeds: [],
      feedItems: [],
      loading: false,
      refreshing: false,
      initialized: false,
      lastRefreshed: null,
      hydrated: false,

      // === SETTERS ===
      setFeeds: (feeds) => set({ feeds }),
      setFeedItems: (items) => set({ feedItems: items }),
      setHydrated: (state) => set({ hydrated: state }),

      // === ACTIONS ===

      /**
       * addFeed: Fetches/validates a new feed via the worker,
       * merges the new feed and items into the store, and sorts items by date.
       */
      addFeed: async (url) => {
        set({ loading: true })
        const { feeds, feedItems, sortFeedItemsByDate } = get()
        
        // Check if feed already exists (protocol-agnostic)
        const normalizedNewUrl = normalizeUrl(url)
        const feedExists = feeds.some(f => normalizeUrl(f.feedUrl) === normalizedNewUrl)
        
        if (feedExists) {
          set({ loading: false })
          return { 
            success: false, 
            message: "This feed is already in your subscriptions" 
          }
        }

        try {
          // Use worker service to fetch feed
          const result = await workerService.fetchFeeds(url)
          
          if (result.success && result.feeds.length > 0) {
            const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items])
            set({
              feeds: [...feeds, ...result.feeds],
              feedItems: sortedItems,
            })
            return { 
              success: true, 
              message: `Added: ${result.feeds[0].feedTitle}`
            }
          } else {
            return {
              success: false,
              message: result.message || "Failed to add feed.",
            }
          }
        } catch (error: any) {
          const msg = error?.message || "Unknown error adding feed."
          return { success: false, message: msg }
        } finally {
          set({ loading: false })
        }
      },

      /**
       * refreshFeeds: Re-fetches *all* feeds via the worker, merges items,
       * and updates the store.
       */
      refreshFeeds: async () => {
        const { feeds, feedItems, shouldRefresh: needsRefresh } = get()
        
        // Only skip refresh if we have feeds AND items AND don't need refresh
        if (feeds.length > 0 && feedItems.length > 0 && !needsRefresh()) {
          console.log(`Skipping refresh because we have feeds and items and don\'t need refresh yet`);
          set({ initialized: true })
          return
        }

        set({ refreshing: true })
        try {
          const feedUrls = feeds.map((f) => f.feedUrl)
          if (feedUrls.length === 0) {
            console.log('No feeds to refresh')
            set({ refreshing: false, initialized: true })
            return
          }
          
          // Use worker service to refresh feeds
          const result = await workerService.refreshFeeds(feedUrls)
          
          if (result.success) {
            const existingIds = new Set(feedItems.map(item => item.id))
            const newItems = result.items.filter(item => !existingIds.has(item.id))
            const mergedItems = [...feedItems, ...newItems]
            const sorted = get().sortFeedItemsByDate(mergedItems)

            set({
              feeds: result.feeds,
              feedItems: sorted,
              lastRefreshed: Date.now(),
              initialized: true
            })
          }
        } catch (error) {
          console.error("Error refreshing feeds:", error)
        } finally {
          set({ refreshing: false })
        }
      },

      /**
       * sortFeedItemsByDate: Takes a list of items and returns them 
       * in descending order by published date.
       */
      sortFeedItemsByDate: (items) => {
        return [...items].sort(
          (a, b) =>
            new Date(b.published).getTime() - new Date(a.published).getTime()
        )
      },

      /**
       * removeFeed: Removes a feed by URL and filters out all items that match.
       */
      removeFeed: (feedUrl) => {
        const { feeds, feedItems } = get()
        set({
          feeds: feeds.filter((f) => f.feedUrl !== feedUrl),
          feedItems: feedItems.filter((item) => item.feedUrl !== feedUrl),
        })
      },

      /**
       * setInitialized: Simple setter for the "initialized" flag
       */
      setInitialized: (value) => set({ initialized: value }),

      /**
       * shouldRefresh: Checks if it's time to refresh feeds
       */
      shouldRefresh: () => {
        const { lastRefreshed } = get()
        if (!lastRefreshed) return true
        
        // Check if 30 minutes have passed
        const thirtyMinutes = 30 * 60 * 1000
        return Date.now() - lastRefreshed > thirtyMinutes
      },

      /**
       * addFeeds: Batch version to add multiple feeds at once
       * Now uses the worker service for each feed
       */
      addFeeds: async (urls) => {
        set({ loading: true })
        const successful: Array<{ url: string, message: string }> = []
        const failed: Array<{ url: string, message: string }> = [] 
        
        // Process sequentially to avoid race conditions
        for (const url of urls) {
          try {
            // Get current state for each iteration
            const { feeds, feedItems, sortFeedItemsByDate } = get()
            
            // Check if this feed already exists (protocol-agnostic)
            const normalizedNewUrl = normalizeUrl(url)
            const feedExists = feeds.some(f => normalizeUrl(f.feedUrl) === normalizedNewUrl)
            
            if (feedExists) {
              failed.push({ 
                url, 
                message: "This feed is already in your subscriptions" 
              })
              continue
            }
            
            // Use worker service to fetch each feed
            const result = await workerService.fetchFeeds(url)
            
            if (result.success && result.feeds.length > 0) {
              // Update the store with this feed and its items
              const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items])
              set({
                feeds: [...feeds, ...result.feeds],
                feedItems: sortedItems,
              })
              successful.push({ 
                url, 
                message: `Added: ${result.feeds[0].feedTitle}` 
              })
            } else {
              failed.push({ 
                url, 
                message: result.message || "Failed to add feed." 
              })
            }
          } catch (error: any) {
            const msg = error?.message || "Unknown error adding feed."
            failed.push({ url, message: msg })
          }
        }
        
        set({ loading: false })
        return { successful, failed }
      },
    }),
    {
      name: "digests-feed-store",
      version: 1,
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        feeds: state.feeds,
        feedItems: state.feedItems,
        initialized: state.initialized,
        lastRefreshed: state.lastRefreshed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          hydrated = true
          useFeedStore.getState().setHydrated(true)
          
          // Initialize worker service after hydration
          if (typeof window !== 'undefined') {
            workerService.initialize();
          }
        }
      },
    }
  )
)

// Helper function for using the store with hydration
export const useHydratedStore = <T>(selector: (state: FeedState) => T): T => {
  const [hydrationDone, setHydrationDone] = useState(false);
  
  useEffect(() => {
    if (hydrated) {
      setHydrationDone(true);
    }
  }, []);

  const value = useFeedStore(selector);
  
  return hydrationDone ? value : (Array.isArray(value) ? [] as T : undefined as T);
};