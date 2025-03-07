// store/useFeedStore.ts

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"

import type { Feed, FeedItem } from "@/lib/rss"
import { fetchFeedsAction, refreshFeedsAction } from "@/app/actions"

/** 
 * The Zustand store shape (as you requested):
 * Feeds, feed items, flags, plus actions 
 */
interface FeedState {
  feeds: Feed[]
  feedItems: FeedItem[]
  loading: boolean
  refreshing: boolean
  initialized: boolean
  lastRefreshed: number | null

  // Setters
  setFeeds: (feeds: Feed[]) => void
  setFeedItems: (items: FeedItem[]) => void

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

/**
 * Create a Zustand store with persist middleware, storing data in IndexedDB.
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

      // === SETTERS ===
      setFeeds: (feeds) => set({ feeds }),
      setFeedItems: (items) => set({ feedItems: items }),

      // === ACTIONS ===

      /**
       * addFeed: Fetches/validates a new feed from the server,
       * merges the new feed and items into the store, and sorts items by date.
       */
      addFeed: async (url) => {
        set({ loading: true })
        const { feeds, feedItems, sortFeedItemsByDate } = get()

        try {
          const result = await fetchFeedsAction(url)
          if (result.success && result.feeds && result.items) {
            const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items])
            set({
              feeds: [...feeds, ...result.feeds],
              feedItems: sortedItems,
            })
            return { success: true, message: result.message }
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
       * refreshFeeds: Re-fetches *all* feeds from the server, merges items,
       * and optionally replaces the feeds array with the returned ones.
       */
      refreshFeeds: async () => {
        const { feeds, feedItems, shouldRefresh: needsRefresh } = get()
        
        // If we have items and don't need a refresh, just return
        if (feedItems.length > 0 && !needsRefresh()) {
          set({ initialized: true })
          return
        }

        set({ refreshing: true })
        try {
          const feedUrls = feeds.map((f) => f.feedUrl)
          const result = await refreshFeedsAction(feedUrls)
          
          if (result.success && result.feeds && result.items) {
            // Deduplicate items by ID
            const existingIds = new Set(feedItems.map(item => item.id))
            const newItems = result.items.filter(item => !existingIds.has(item.id))
            
            // Merge and sort
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
       * in descending order by published date. (Used internally)
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

      shouldRefresh: () => {
        const { lastRefreshed } = get()
        if (!lastRefreshed) return true
        
        // Check if 30 minutes have passed
        const thirtyMinutes = 30 * 60 * 1000
        return Date.now() - lastRefreshed > thirtyMinutes
      },

      /**
       * addFeeds: Batch version to add multiple feeds at once
       * Properly accumulates results to prevent race conditions
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
            
            // Check if this feed already exists
            if (feeds.some(f => f.feedUrl === url)) {
              failed.push({ 
                url, 
                message: "This feed is already in your subscriptions" 
              })
              continue
            }
            
            const result = await fetchFeedsAction(url)
            
            if (result.success && result.feeds && result.items) {
              // Update the store with this feed and its items
              const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items])
              set({
                feeds: [...feeds, ...result.feeds],
                feedItems: sortedItems,
              })
              successful.push({ url, message: result.message })
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
      // Name of the storage key
      name: "digests-feed-store",
      version: 1,
      // Store as JSON in IndexedDB via localforage
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        feeds: state.feeds,
        feedItems: state.feedItems,
        initialized: state.initialized,
        lastRefreshed: state.lastRefreshed,
      }),
      // If you need to transform older data when version changes, implement migrate()
    }
  )
)
