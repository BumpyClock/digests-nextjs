// store/useFeedStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"
import { useState, useEffect } from "react"

import type { Feed, FeedItem } from "@/types"
import { workerService } from "@/services/worker-service"

/**
 * The Zustand store shape with web worker integration
 * @typedef {Object} FeedState
 * @property {Feed[]} feeds - List of feeds
 * @property {FeedItem[]} feedItems - List of feed items
 * @property {boolean} loading - Loading state
 * @property {boolean} refreshing - Refreshing state
 * @property {boolean} initialized - Initialization state
 * @property {number | null} lastRefreshed - Timestamp of last refresh
 * @property {boolean} hydrated - Hydration state
 * @property {Set<string>} readItems - Track read item IDs
 * @property {string | null} activeFeed - Track active feed URL
 * @property {Set<string>} readLaterItems - Track read later item IDs
 * @method setFeeds - Sets the feeds in the store
 * @method setFeedItems - Sets the feed items in the store
 * @method setHydrated - Sets the hydration state
 * @method addFeed - Adds a new feed
 * @method refreshFeeds - Refreshes all feeds
 * @method sortFeedItemsByDate - Sorts feed items by published date
 * @method removeFeed - Removes a feed by URL
 * @method setInitialized - Sets the initialized state
 * @method shouldRefresh - Checks if it's time to refresh feeds
 * @method addFeeds - Adds multiple feeds at once
 * @method checkForUpdates - Checks for new items without updating the store
 * @method markAsRead - Marks a specific feed item as read
 * @method getUnreadItems - Gets all unread feed items
 * @method markAllAsRead - Marks all feed items as read
 * @method setActiveFeed - Sets the active feed URL
 * @method addToReadLater - Adds an item to read later
 * @method removeFromReadLater - Removes an item from read later
 * @method isInReadLater - Checks if an item is in read later
 * @method getReadLaterItems - Gets all items in the read later list
 */
interface FeedState {
  feeds: Feed[]
  feedItems: FeedItem[]
  loading: boolean
  refreshing: boolean
  initialized: boolean
  lastRefreshed: number | null
  hydrated: boolean
  readItems: Set<string>
  activeFeed: string | null
  readLaterItems: Set<string>

  // Setters
  setFeeds: (feeds: Feed[]) => void
  setFeedItems: (items: FeedItem[]) => void
  setHydrated: (state: boolean) => void
  setActiveFeed: (feedUrl: string | null) => void

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
  checkForUpdates: () => Promise<{ hasNewItems: boolean, count: number }>
  markAsRead: (itemId: string) => void
  getUnreadItems: () => FeedItem[]
  markAllAsRead: () => void
  addToReadLater: (itemId: string) => void
  removeFromReadLater: (itemId: string) => void
  isInReadLater: (itemId: string) => boolean
  getReadLaterItems: () => FeedItem[]
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
      readItems: new Set<string>(),
      activeFeed: null,
      readLaterItems: new Set<string>(),

      // === SETTERS ===
      setFeeds: (feeds) => set({ feeds }),
      setFeedItems: (items) => set({ feedItems: items }),
      setHydrated: (state) => set({ hydrated: state }),
      setActiveFeed: (feedUrl) => set({ activeFeed: feedUrl }),

      // === ACTIONS ===

      /**
       * Adds a new feed by fetching and validating it via the worker.
       * Merges the new feed and items into the store, and sorts items by date.
       * @param {string} url - The URL of the feed to add
       * @returns {Promise<{ success: boolean; message: string }>} - Result of the operation
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
       * Refreshes all feeds by re-fetching them via the worker.
       * Merges items and updates the store.
       * @returns {Promise<void>}
       */
      refreshFeeds: async () => {
        const { feeds, feedItems, shouldRefresh: needsRefresh } = get()
        
        if (!feeds.length) {
          set({ initialized: true, refreshing: false })
          return
        }

        set({ refreshing: true })
        try {
          const feedUrls = feeds.map((f) => f.feedUrl)
          const result = await workerService.refreshFeeds(feedUrls)
          
          if (result.success) {
            // Deduplicate items by ID
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
          // Set initialized even on error to prevent infinite refresh attempts
          set({ initialized: true })
        } finally {
          set({ refreshing: false })
        }
      },

      /**
       * Sorts a list of feed items by published date in descending order.
       * @param {FeedItem[]} items - The list of feed items to sort
       * @returns {FeedItem[]} - Sorted list of feed items
       */
      sortFeedItemsByDate: (items) => {
        return [...items].sort(
          (a, b) =>
            new Date(b.published).getTime() - new Date(a.published).getTime()
        )
      },

      /**
       * Removes a feed by its URL and filters out all items that match.
       * @param {string} feedUrl - The URL of the feed to remove
       */
      removeFeed: (feedUrl) => {
        const { feeds, feedItems, readItems } = get()
        
        // Get all item IDs associated with this feed
        const feedItemIds = feedItems
          .filter(item => item.feedUrl === feedUrl)
          .map(item => item.id)
        
        // Create new Set without the removed feed's items
        const newReadItems = new Set(readItems)
        feedItemIds.forEach(id => newReadItems.delete(id))
        
        set({
          feeds: feeds.filter((f) => f.feedUrl !== feedUrl),
          feedItems: feedItems.filter((item) => item.feedUrl !== feedUrl),
          readItems: newReadItems
        })
      },

      /**
       * Sets the initialized state of the store.
       * @param {boolean} value - The initialized state
       */
      setInitialized: (value) => set({ initialized: value }),

      /**
       * Checks if it's time to refresh feeds based on the last refreshed timestamp.
       * @returns {boolean} - True if refresh is needed, false otherwise
       */
      shouldRefresh: () => {
        const { lastRefreshed } = get()
        if (!lastRefreshed) return true
        
        // Check if 30 minutes have passed
        const thirtyMinutes = 30 * 60 * 1000
        return Date.now() - lastRefreshed > thirtyMinutes
      },

      /**
       * Adds multiple feeds at once, processing each sequentially.
       * @param {string[]} urls - The URLs of the feeds to add
       * @returns {Promise<{ successful: Array<{ url: string, message: string }>, failed: Array<{ url: string, message: string }> }>} - Result of the operation
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

      /**
       * Checks for new items without updating the store.
       * @returns {Promise<{ hasNewItems: boolean, count: number }>} - Result of the check
       */
      checkForUpdates: async () => {
        const { feeds, feedItems } = get()
        
        if (!feeds.length) {
          return { hasNewItems: false, count: 0 }
        }

        try {
          const feedUrls = feeds.map((f) => f.feedUrl)
          const result = await workerService.checkForUpdates(feedUrls)
          
          if (result.success) {
            // Check for new items by comparing IDs
            const existingIds = new Set(feedItems.map(item => item.id))
            const newItems = result.items.filter(item => !existingIds.has(item.id))
            
            return { 
              hasNewItems: newItems.length > 0,
              count: newItems.length
            }
          }
          
          return { hasNewItems: false, count: 0 }
        } catch (error) {
          console.error("Error checking for updates:", error)
          return { hasNewItems: false, count: 0 }
        }
      },

      /**
       * Marks a specific feed item as read.
       * @param {string} itemId - The ID of the item to mark as read
       */
      markAsRead: (itemId) => {
        const { readItems } = get()
        // Ensure we're working with a Set
        const newReadItems = new Set(readItems instanceof Set ? readItems : [])
        
        // Check if the item is already marked as read to prevent unnecessary updates
        if (!newReadItems.has(itemId)) {
          newReadItems.add(itemId)
          
          // Use a "structural equality" check to avoid unnecessary rerenders
          // Only update the store if the readItems set actually changed
          set((state) => {
            // This ensures components that don't depend on readItems won't re-render
            return { readItems: newReadItems }
          }, false) // false means don't replace the entire state, just merge
        }
      },

      /**
       * Gets all unread feed items.
       * @returns {FeedItem[]} - List of unread feed items
       */
      getUnreadItems: () => {
        const { feedItems, readItems } = get()
        // Safety check to ensure readItems is a Set
        const readItemsSet = readItems instanceof Set ? readItems : new Set()
        const unreadItems = feedItems.filter(item => !readItemsSet.has(item.id))
        console.log("unreadItems", unreadItems);
        // Ensure it returns an empty array if no unread items
        return unreadItems.length > 0 ? unreadItems : []
      },

      /**
       * Marks all feed items as read.
       */
      markAllAsRead: () => {
        const { feedItems } = get()
        const allIds = new Set(feedItems.map(item => item.id))
        set({ readItems: allIds })
      },

      addToReadLater: (itemId) => {
        const { readLaterItems } = get()
        const newReadLaterItems = new Set(readLaterItems)
        newReadLaterItems.add(itemId)
        set({ readLaterItems: newReadLaterItems })
      },

      removeFromReadLater: (itemId) => {
        const { readLaterItems } = get()
        const newReadLaterItems = new Set(readLaterItems)
        newReadLaterItems.delete(itemId)
        set({ readLaterItems: newReadLaterItems })
      },

      isInReadLater: (itemId) => {
        const { readLaterItems } = get()
        return readLaterItems.has(itemId)
      },

      getReadLaterItems: () => {
        const { feedItems, readLaterItems } = get()
        // Ensure readLaterItems is a Set
        const readLaterSet = readLaterItems instanceof Set ? readLaterItems : new Set()
        return feedItems.filter(item => readLaterSet.has(item.id))
      },
    }),
    {
      name: "digests-feed-store",
      version: 2,
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        feeds: state.feeds,
        feedItems: state.feedItems,
        initialized: state.initialized,
        lastRefreshed: state.lastRefreshed,
        readItems: Array.isArray(state.readItems) ? state.readItems : Array.from(state.readItems || []),
        activeFeed: state.activeFeed,
        readLaterItems: Array.isArray(state.readLaterItems) ? state.readLaterItems : Array.from(state.readLaterItems || []),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          try {
            // Initialize readItems as Set
            if (!state.readItems) {
              state.readItems = new Set();
            } else if (Array.isArray(state.readItems)) {
              state.readItems = new Set(state.readItems);
            } else {
              console.warn('Invalid readItems format, resetting to empty Set');
              state.readItems = new Set();
            }
            
            // Initialize readLaterItems as Set
            if (!state.readLaterItems) {
              state.readLaterItems = new Set();
            } else if (Array.isArray(state.readLaterItems)) {
              state.readLaterItems = new Set(state.readLaterItems);
            } else {
              console.warn('Invalid readLaterItems format, resetting to empty Set');
              state.readLaterItems = new Set();
            }
            
            hydrated = true;
            useFeedStore.getState().setHydrated(true);
            
            // Ensure the Set conversion actually worked
            const store = useFeedStore.getState();
            if (!(store.readItems instanceof Set)) {
              console.warn('readItems is not a Set after rehydration, setting manually');
              store.readItems = new Set(Array.isArray(state.readItems) ? state.readItems : []);
            }
            
            if (!(store.readLaterItems instanceof Set)) {
              console.warn('readLaterItems is not a Set after rehydration, setting manually');
              store.readLaterItems = new Set(Array.isArray(state.readLaterItems) ? state.readLaterItems : []);
            }
            
            // Initialize worker service after hydration
            const idleCallback =
              typeof window !== "undefined" && window.requestIdleCallback
                ? window.requestIdleCallback
                : (cb: () => void) => setTimeout(cb, 0);
            idleCallback(() => {
              workerService.initialize();
            });
          } catch (error) {
            console.error('Error during store rehydration:', error);
            state.readItems = new Set();
            state.readLaterItems = new Set();
            useFeedStore.getState().readItems = new Set();
            useFeedStore.getState().readLaterItems = new Set();
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