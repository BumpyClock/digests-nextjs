// store/useFeedStore.ts
import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand"
import { persist, createJSONStorage, type PersistOptions } from "zustand/middleware"
import localforage from "localforage"
import { useState, useEffect, useRef } from "react"

import type { Feed, FeedItem } from "@/types"
import type { Subscription } from "@/types/subscription"
import { createFeedSlice } from "./slices/feedSlice"
import { createReadStatusSlice } from "./slices/readStatusSlice"
import { createMetadataSlice } from "./slices/metadataSlice"
import { createAudioSlice, type AudioSlice } from "./slices/audioSlice"
import { withPerformanceMonitoring } from "./middleware/performanceMiddleware"
import { Logger } from "@/utils/logger"
import { deserializeSet } from "@/lib/serializers/set-serializer"

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

let feedStoreApi: UseBoundStore<StoreApi<FeedState>> | null = null

const getFeedStore = (): UseBoundStore<StoreApi<FeedState>> => {
  if (!feedStoreApi) {
    throw new Error("Feed store accessed before initialization")
  }

  return feedStoreApi
}

type BaseFeedStoreCreator = StateCreator<FeedState, [], [], FeedState>

const composeFeedStoreSlices: BaseFeedStoreCreator = (set, get, _api) => ({
  // Combine all slices
  ...createFeedSlice(set, get),
  ...createReadStatusSlice(set, get),
  ...createMetadataSlice(set, get),
  ...createAudioSlice(set, get),

  // Server state is now handled by React Query
})

const createFeedStorePersistOptions = (
  getStore: () => UseBoundStore<StoreApi<FeedState>>
): PersistOptions<FeedState> => ({
  name: "digests-feed-store",
  version: 3,
  storage: createJSONStorage(() => localforage),
  migrate: (state: Record<string, unknown>, from: number) => {
    try {
      if (from < 3) {
        // Drop persisted items and normalize Sets
        // Remove old feedItems property (now handled by React Query)
        const { feedItems: _, ...cleanState } = state
        Object.assign(state, cleanState)
        // Drop large feeds array from persistence if present
        if (state.feeds) delete state.feeds
        // Use utility for clean Set deserialization
        state.readItems = deserializeSet(state.readItems)
        state.readLaterItems = deserializeSet(state.readLaterItems)
      }
    } catch {
      // Fallback if migration fails
      Logger.error('[Store] Migration failed, resetting state')
      state.readItems = new Set()
      state.readLaterItems = new Set()
    }
    return state
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
          state.readItems = new Set()
        } else if (Array.isArray(state.readItems)) {
          state.readItems = new Set(state.readItems)
        } else {
          Logger.warn('Invalid readItems format, resetting to empty Set')
          state.readItems = new Set()
        }

        // Initialize readLaterItems as Set
        if (!state.readLaterItems) {
          state.readLaterItems = new Set()
        } else if (Array.isArray(state.readLaterItems)) {
          state.readLaterItems = new Set(state.readLaterItems)
        } else {
          Logger.warn('Invalid readLaterItems format, resetting to empty Set')
          state.readLaterItems = new Set()
        }

        hydrated = true
        const store = getStore()
        const storeState = store.getState()
        storeState.setHydrated(true)

        // If feeds are empty but subscriptions exist, seed minimal feeds for URL computation
        if ((!Array.isArray(storeState.feeds) || storeState.feeds.length === 0) && Array.isArray((state as Record<string, unknown>).subscriptions)) {
          const subs = (state as Record<string, unknown>).subscriptions as Subscription[]
          // Seed feeds with minimal info (will be replaced by RQ data)
          const seededFeeds = subs.map(
            (s) =>
              ({
                type: '',
                guid: '',
                status: '',
                siteTitle: s.siteTitle,
                feedTitle: s.feedTitle,
                feedUrl: s.feedUrl,
                description: '',
                link: '',
                lastUpdated: '',
                lastRefreshed: '',
                published: '',
                author: null,
                language: s.language,
                favicon: s.favicon,
                categories: '',
              }) as unknown as Feed
          )

          storeState.setFeeds(seededFeeds)
        }

        // Ensure the Set conversion actually worked
        if (!(storeState.readItems instanceof Set)) {
          Logger.warn('readItems is not a Set after rehydration, setting manually')
          storeState.readItems = new Set(Array.isArray(state.readItems) ? state.readItems : [])
        }

        if (!(storeState.readLaterItems instanceof Set)) {
          Logger.warn('readLaterItems is not a Set after rehydration, setting manually')
          storeState.readLaterItems = new Set(Array.isArray(state.readLaterItems) ? state.readLaterItems : [])
        }
      } catch (error) {
        Logger.error('Error during store rehydration', error instanceof Error ? error : undefined)
        state.readItems = new Set()
        state.readLaterItems = new Set()
        const store = getStore()
        const storeState = store.getState()
        storeState.readItems = new Set()
        storeState.readLaterItems = new Set()
      }
    }
  },
})

const feedStoreInitializer = persist(
  composeFeedStoreSlices,
  createFeedStorePersistOptions(getFeedStore)
)

const preparedFeedStoreInitializer =
  process.env.NODE_ENV === 'development'
    ? withPerformanceMonitoring(feedStoreInitializer, 'FeedStore')
    : feedStoreInitializer

export const useFeedStore = create<FeedState>()(preparedFeedStoreInitializer)

feedStoreApi = useFeedStore

/**
 * Hydration-aware selector hook that returns the fallback until persistence finishes,
 * then switches to the live store value. Provide a stable/memoized fallback (e.g. via
 * useMemo) to avoid reference churn; the hook caches the initial fallback internally,
 * so callers must memoize complex objects they pass in.
 */
export const useHydratedStore = <T>(
  selector: (state: FeedState) => T,
  fallback?: T
): T => {
  const [hydrationDone, setHydrationDone] = useState(() => hydrated)
  const fallbackRef = useRef<T>(
    fallback !== undefined ? fallback : selector(useFeedStore.getState())
  )

  useEffect(() => {
    if (hydrationDone) {
      return
    }

    if (hydrated) {
      setHydrationDone(true)
      return
    }

    const unsubscribe = useFeedStore.subscribe(
      (state) => state.hydrated,
      (isHydrated) => {
        if (isHydrated) {
          setHydrationDone(true)
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [hydrationDone])

  const value = useFeedStore(selector)

  return hydrationDone ? value : fallbackRef.current
}
