// store/useFeedStore.ts

import localforage from "localforage";
import { useEffect, useRef, useState } from "react";
import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { createJSONStorage, type PersistOptions, persist } from "zustand/middleware";
import { deserializeSet } from "@/lib/serializers/set-serializer";
import { Logger } from "@/utils/logger";
import { toSubscription } from "@/utils/selectors";
import { withPerformanceMonitoring } from "./middleware/performanceMiddleware";
import { type AudioSlice, createAudioSlice } from "./slices/audioSlice";
import { createFeedSlice, type FeedSlice } from "./slices/feedSlice";
import { createMetadataSlice, type MetadataSlice } from "./slices/metadataSlice";
import { createReadStatusSlice, type ReadStatusSlice } from "./slices/readStatusSlice";

/**
 * The Zustand store shape optimized for React Query integration
 * Server state is now handled by React Query, this only manages client state
 * @typedef {Object} FeedState
 * @property {boolean} initialized - Initialization state
 * @property {boolean} hydrated - Hydration state
 * @property {Set<string>} readItems - Track read item IDs
 * @property {string | null} activeFeed - Track active feed URL
 * @property {Set<string>} readLaterItems - Track read later item IDs
 * @method setSubscriptions - Replaces lightweight subscription list
 * @method setHydrated - Sets the hydration state
 * @method removeFeedSubscription - Removes a feed subscription
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
interface FeedState extends FeedSlice, ReadStatusSlice, MetadataSlice, AudioSlice {}

// Add hydration flag at top of file
let hydrated = false;

let feedStoreApi: UseBoundStore<StoreApi<FeedState>> | null = null;

const getFeedStore = (): UseBoundStore<StoreApi<FeedState>> => {
  if (!feedStoreApi) {
    throw new Error("Feed store accessed before initialization");
  }

  return feedStoreApi;
};

type BaseFeedStoreCreator = StateCreator<FeedState, [], [], FeedState>;

const composeFeedStoreSlices: BaseFeedStoreCreator = (set, get, _api) => ({
  // Combine all slices
  ...createFeedSlice(set, get, _api),
  ...createReadStatusSlice(set, get, _api),
  ...createMetadataSlice(set, get, _api),
  ...createAudioSlice(set, get, _api),

  // Server state is now handled by React Query
});

const createFeedStorePersistOptions = (getStore: () => UseBoundStore<StoreApi<FeedState>>) =>
  ({
    name: "digests-feed-store",
    version: 3,
    storage: createJSONStorage(() => localforage),
    migrate: (persistedState: unknown, from: number) => {
      const state = (persistedState ?? {}) as Record<string, unknown>;
      try {
        if (from < 3) {
          // Drop persisted items and normalize Sets
          // Remove old feedItems property (now handled by React Query)
          delete (state as any).feedItems;
          // Drop large feeds array from persistence if present
          if (state.feeds && Array.isArray(state.feeds)) {
            state.subscriptions = (state.feeds as Array<{ feedUrl?: unknown }>)
              .filter((feed) => typeof feed?.feedUrl === "string")
              .map((feed) => toSubscription(feed as never));
            delete state.feeds;
          }
          // Use utility for clean Set deserialization
          state.readItems = deserializeSet(state.readItems);
          state.readLaterItems = deserializeSet(state.readLaterItems);
        }
      } catch {
        // Fallback if migration fails
        Logger.error("[Store] Migration failed, resetting state");
        state.readItems = new Set();
        state.readLaterItems = new Set();
      }
      return state as unknown as FeedState;
    },
    partialize: (state: FeedState) =>
      ({
        // Persist only lightweight subscriptions and client/UI state
        subscriptions: state.subscriptions,
        // Do NOT persist feedItems - handled by React Query
        initialized: state.initialized,
        readItems: Array.isArray(state.readItems)
          ? state.readItems
          : Array.from(state.readItems || []),
        activeFeed: state.activeFeed,
        readLaterItems: Array.isArray(state.readLaterItems)
          ? state.readLaterItems
          : Array.from(state.readLaterItems || []),
        // Audio state
        volume: state.volume,
        isMuted: state.isMuted,
        isMinimized: state.isMinimized,
      }) as unknown as Partial<FeedState>,
    onRehydrateStorage: () => (state: FeedState | undefined) => {
      if (state && typeof window !== "undefined") {
        try {
          const store = getStore();
          
          // Compute new Set values
          let newReadItems: Set<string>;
          if (!state.readItems) {
            newReadItems = new Set();
          } else if (Array.isArray(state.readItems)) {
            newReadItems = new Set(state.readItems);
          } else {
            Logger.warn("Invalid readItems format, resetting to empty Set");
            newReadItems = new Set();
          }

          let newReadLaterItems: Set<string>;
          if (!state.readLaterItems) {
            newReadLaterItems = new Set();
          } else if (Array.isArray(state.readLaterItems)) {
            newReadLaterItems = new Set(state.readLaterItems);
          } else {
            Logger.warn("Invalid readLaterItems format, resetting to empty Set");
            newReadLaterItems = new Set();
          }

          // Use setState to update both Sets
          store.setState({
            readItems: newReadItems,
            readLaterItems: newReadLaterItems,
          });

          hydrated = true;
          const storeState = store.getState();
          storeState.setHydrated(true);

          // Ensure the Set conversion actually worked
          if (!(storeState.readItems instanceof Set)) {
            Logger.warn("readItems is not a Set after rehydration, setting manually");
            store.setState({
              readItems: new Set(Array.isArray(state.readItems) ? state.readItems : []),
            });
          }

          if (!(storeState.readLaterItems instanceof Set)) {
            Logger.warn("readLaterItems is not a Set after rehydration, setting manually");
            store.setState({
              readLaterItems: new Set(
                Array.isArray(state.readLaterItems) ? state.readLaterItems : []
              ),
            });
          }
        } catch (error) {
          Logger.error(
            "Error during store rehydration",
            error instanceof Error ? error : undefined
          );
          state.readItems = new Set();
          state.readLaterItems = new Set();
          const store = getStore();
          store.setState({ readItems: new Set(), readLaterItems: new Set() });
        }
      }
    },
  }) as PersistOptions<FeedState>;

const feedStoreInitializer = persist(
  composeFeedStoreSlices,
  createFeedStorePersistOptions(getFeedStore)
);

const preparedFeedStoreInitializer =
  process.env.NODE_ENV === "development"
    ? withPerformanceMonitoring(feedStoreInitializer, "FeedStore")
    : feedStoreInitializer;

export const useFeedStore = create<FeedState>()(preparedFeedStoreInitializer);

feedStoreApi = useFeedStore;

/**
 * Hydration-aware selector hook that returns the fallback until persistence finishes,
 * then switches to the live store value. Provide a stable/memoized fallback (e.g. via
 * useMemo) to avoid reference churn; the hook caches the initial fallback internally,
 * so callers must memoize complex objects they pass in.
 */
export const useHydratedStore = <T>(selector: (state: FeedState) => T, fallback?: T): T => {
  const [hydrationDone, setHydrationDone] = useState(() => hydrated);
  const fallbackRef = useRef<T>(
    fallback !== undefined ? fallback : selector(useFeedStore.getState())
  );

  useEffect(() => {
    if (hydrationDone) {
      return;
    }

    if (hydrated || useFeedStore.persist.hasHydrated()) {
      hydrated = true;
      setHydrationDone(true);
      return;
    }

    const unsubscribe = useFeedStore.persist.onFinishHydration(() => {
      hydrated = true;
      setHydrationDone(true);
    });

    return () => {
      unsubscribe();
    };
  }, [hydrationDone]);

  const value = useFeedStore(selector);

  return hydrationDone ? value : fallbackRef.current;
};
