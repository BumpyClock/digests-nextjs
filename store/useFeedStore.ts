// store/useFeedStore.ts

import localforage from "localforage";
import { useRef, useSyncExternalStore } from "react";
import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { createJSONStorage, type PersistOptions, persist } from "zustand/middleware";
import { deserializeSet } from "@/lib/serializers/set-serializer";
import type { Feed } from "@/types";
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
 * @property {Set<string>} readItems - Track read item IDs
 * @property {string | null} activeFeed - Track active feed URL
 * @property {Set<string>} readLaterItems - Track read later item IDs
 * @method setSubscriptions - Replaces lightweight subscription list
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

const isFeed = (value: unknown): value is Feed => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.feedUrl === "string" &&
    typeof obj.guid === "string" &&
    typeof obj.feedTitle === "string" &&
    typeof obj.type === "string"
  );
};

const removeLegacyFeedItemsKey = (state: Record<string, unknown>): void => {
  // Legacy persisted key cleanup only; React Query owns server feed data.
  delete state["feedItems"];
};

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
          if ("feedItems" in state) {
            removeLegacyFeedItemsKey(state);
          }
          // Drop large feeds array from persistence if present
          if (Array.isArray(state.feeds)) {
            state.subscriptions = state.feeds
              .filter((feed) => isFeed(feed))
              .map((feed) => toSubscription(feed));
          } else if (state.feeds !== undefined) {
            Logger.warn("[Store] Skipping migration for feeds: invalid persisted structure", {
              type: typeof state.feeds,
            });
          }
          delete state.feeds;
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

          const storeState = store.getState();
          if (
            !(storeState.readItems instanceof Set) ||
            !(storeState.readLaterItems instanceof Set)
          ) {
            Logger.warn("[Store] Rehydration produced invalid read item sets");
            store.setState({
              readItems: new Set(
                Array.isArray(state.readItems) ? state.readItems : Array.from(newReadItems)
              ),
              readLaterItems: new Set(
                Array.isArray(state.readLaterItems)
                  ? state.readLaterItems
                  : Array.from(newReadLaterItems)
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

const getStoreHydrationState = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return useFeedStore.persist.hasHydrated();
};

/**
 * Hydration-aware selector hook that returns the fallback until persistence finishes,
 * then switches to the live store value. Provide a stable/memoized fallback (e.g. via
 * useMemo) to avoid reference churn; the hook caches the initial fallback internally,
 * so callers must memoize complex objects they pass in.
 */
export const useHydratedStore = <T>(selector: (state: FeedState) => T, fallback?: T): T => {
  const hydrationDone = useSyncExternalStore(
    (onStoreChange) => useFeedStore.persist.onFinishHydration(onStoreChange),
    getStoreHydrationState,
    () => false
  );
  const fallbackRef = useRef<T>(
    fallback !== undefined ? fallback : selector(useFeedStore.getState())
  );

  const value = useFeedStore(selector);

  return hydrationDone ? value : fallbackRef.current;
};
