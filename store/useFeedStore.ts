// store/useFeedStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"
import { useState, useEffect } from "react"

import type { Feed, FeedItem } from "@/types"
import type { Subscription } from "@/types/subscription"
import { createFeedSlice } from "./slices/feedSlice"
import { createReadStatusSlice } from "./slices/readStatusSlice"
import { createMetadataSlice } from "./slices/metadataSlice"
import { createAudioSlice, type AudioSlice } from "./slices/audioSlice"
import { withPerformanceMonitoring } from "./middleware/performanceMiddleware"

/**
 * The Zustand store shape optimized for React Query integration
 * Server state is now handled by React Query, this only manages client state
 * @typedef {Object} FeedState
 * @property {Feed[]} feeds - List of feeds (synced from React Query)
 * @property {boolean} initialized - Initialization state
 * @property {boolean} hydrated - Hydration state
 * @property {Set<string>} readItems - Track read item IDs
 * @property {string | null} activeFeed - Track active feed URL
 * @property {Set<string>} readLaterItems - Track read later item IDs
 * @method setFeeds - Sets the feeds in the store
 * @method setHydrated - Sets the hydration state
 * @method removeFeedFromCache - Removes a feed from local cache
 * @method setInitialized - Sets the initialized state
 * @method markAsRead - Marks a specific feed item as read
 * @method getUnreadItems - Gets all unread feed items
 * @method markAllAsRead - Marks all feed items as read
 * @method setActiveFeed - Sets the active feed URL
 * @method addToReadLater - Adds an item to read later
 * @method removeFromReadLater - Removes an item from read later
 * @method isInReadLater - Checks if an item is in read later
 * @method getReadLaterItems - Gets all items in the read later list
 */
interface FeedState extends AudioSlice {
  // From slices
  feeds: Feed[]
  subscriptions: Subscription[]
  initialized: boolean
  hydrated: boolean
  readItems: Set<string>
  activeFeed: string | null
  readLaterItems: Set<string>

  // Setters
  setFeeds: (feeds: Feed[]) => void
  setHydrated: (state: boolean) => void
  setActiveFeed: (feedUrl: string | null) => void
  setInitialized: (value: boolean) => void

  // Client-side actions (server actions moved to React Query)
  removeFeedFromCache: (feedUrl: string) => void
  markAsRead: (itemId: string) => void
  getUnreadItems: (items: FeedItem[]) => FeedItem[]
  markAllAsRead: (items: FeedItem[]) => void
  addToReadLater: (itemId: string) => void
  removeFromReadLater: (itemId: string) => void
  isInReadLater: (itemId: string) => boolean
  getReadLaterItems: (items: FeedItem[]) => FeedItem[]
}

// Add hydration flag at top of file
let hydrated = false

export const useFeedStore = create<FeedState>()(
  process.env.NODE_ENV === 'development' 
    ? withPerformanceMonitoring(
        persist(
          (set, get, api) => ({
      // Combine all slices
      ...createFeedSlice(set, get, api),
      ...createReadStatusSlice(set, get, api),
      ...createMetadataSlice(set, get, api),
      ...createAudioSlice(set, get, api),

      // Server state is now handled by React Query
    }),
    {
      name: "digests-feed-store",
      version: 3,
      storage: createJSONStorage(() => localforage),
      migrate: (state: any, from: number) => {
        try {
          if (from < 3) {
            // Drop persisted items and normalize Sets
            // Remove old feedItems property (now handled by React Query)
            const { feedItems: _, ...cleanState } = state;
            Object.assign(state, cleanState);
            // Drop large feeds array from persistence if present
            if (state.feeds) delete state.feeds;
            state.readItems = new Set(Array.isArray(state.readItems) ? state.readItems :
              (state.readItems instanceof Set ? Array.from(state.readItems) : []));
            state.readLaterItems = new Set(Array.isArray(state.readLaterItems) ? state.readLaterItems :
              (state.readLaterItems instanceof Set ? Array.from(state.readLaterItems) : []));
          }
        } catch {
          // Fallback if migration fails
        }
        return state;
      },
      partialize: (state) => ({
        // Persist only lightweight subscriptions and client/UI state
        subscriptions: state.subscriptions,
        // Do NOT persist feedItems - handled by React Query
        initialized: state.initialized,
        readItems: Array.isArray(state.readItems) ? state.readItems : Array.from(state.readItems || []),
        activeFeed: state.activeFeed,
        readLaterItems: Array.isArray(state.readLaterItems) ? state.readLaterItems : Array.from(state.readLaterItems || []),
        // Audio state
        volume: state.volume,
        isMuted: state.isMuted,
        isMinimized: state.isMinimized,
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
            
            // If feeds are empty but subscriptions exist, seed minimal feeds for URL computation
            const store = useFeedStore.getState();
            if ((!Array.isArray(store.feeds) || store.feeds.length === 0) && Array.isArray((state as any).subscriptions)) {
              const subs = (state as any).subscriptions as Subscription[];
              // Seed feeds with minimal info (will be replaced by RQ data)
              store.setFeeds(subs.map(s => ({
                type: '', guid: '', status: '', siteTitle: s.siteTitle, feedTitle: s.feedTitle, feedUrl: s.feedUrl,
                description: '', link: '', lastUpdated: '', lastRefreshed: '', published: '', author: null, language: s.language, favicon: s.favicon, categories: ''
              }) as unknown as Feed));
            }

            // Ensure the Set conversion actually worked
            if (!(store.readItems instanceof Set)) {
              console.warn('readItems is not a Set after rehydration, setting manually');
              store.readItems = new Set(Array.isArray(state.readItems) ? state.readItems : []);
            }
            
            if (!(store.readLaterItems instanceof Set)) {
              console.warn('readLaterItems is not a Set after rehydration, setting manually');
              store.readLaterItems = new Set(Array.isArray(state.readLaterItems) ? state.readLaterItems : []);
            }
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
  ),
  'FeedStore'
)
: persist(
    (set, get, api) => ({
      // Combine all slices
      ...createFeedSlice(set, get, api),
      ...createReadStatusSlice(set, get, api),
      ...createMetadataSlice(set, get, api),
      ...createAudioSlice(set, get, api),

      // Server state is now handled by React Query
    }),
    {
      name: "digests-feed-store",
      version: 3,
      storage: createJSONStorage(() => localforage),
      migrate: (state: any, from: number) => {
        try {
          if (from < 3) {
            // Drop persisted items and normalize Sets
            // Remove old feedItems property (now handled by React Query)
            const { feedItems: _, ...cleanState } = state;
            Object.assign(state, cleanState);
            if (state.feeds) delete state.feeds;
            state.readItems = new Set(Array.isArray(state.readItems) ? state.readItems :
              (state.readItems instanceof Set ? Array.from(state.readItems) : []));
            state.readLaterItems = new Set(Array.isArray(state.readLaterItems) ? state.readLaterItems :
              (state.readLaterItems instanceof Set ? Array.from(state.readLaterItems) : []));
          }
        } catch {
          // Fallback if migration fails
        }
        return state;
      },
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        // Do NOT persist feedItems - handled by React Query
        initialized: state.initialized,
        readItems: Array.isArray(state.readItems) ? state.readItems : Array.from(state.readItems || []),
        activeFeed: state.activeFeed,
        readLaterItems: Array.isArray(state.readLaterItems) ? state.readLaterItems : Array.from(state.readLaterItems || []),
        // Audio state
        volume: state.volume,
        isMuted: state.isMuted,
        isMinimized: state.isMinimized,
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
