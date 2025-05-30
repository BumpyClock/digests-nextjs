/**
 * Granular selectors for the feed store to optimize re-renders
 * These selectors allow components to subscribe to specific parts of the store
 * rather than the entire store, preventing unnecessary re-renders
 */

import { useFeedStore } from "@/store/useFeedStore";
import { useShallow } from "zustand/react/shallow";
import type { FeedItem } from "@/types";

/**
 * Hook to check if a specific item is read
 * @param itemId - The ID of the item to check
 * @returns boolean indicating if the item is read
 */
export const useIsItemRead = (itemId: string): boolean => {
  return useFeedStore(state => {
    const readItems = state.readItems;
    return readItems instanceof Set ? readItems.has(itemId) : false;
  });
};

/**
 * Hook to check if a specific item is in the read later list
 * @param itemId - The ID of the item to check
 * @returns boolean indicating if the item is in read later
 */
export const useIsInReadLater = (itemId: string): boolean => {
  return useFeedStore(state => {
    const readLaterItems = state.readLaterItems;
    return readLaterItems instanceof Set ? readLaterItems.has(itemId) : false;
  });
};

/**
 * Hook to get read-related actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with markAsRead and markAllAsRead functions
 */
export const useReadActions = (): {
  markAsRead: (itemId: string) => void;
  markAllAsRead: () => void;
} => {
  return useFeedStore(
    useShallow(state => ({
      markAsRead: state.markAsRead,
      markAllAsRead: state.markAllAsRead,
    }))
  );
};

/**
 * Hook to get read later actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with addToReadLater and removeFromReadLater functions
 */
export const useReadLaterActions = (): {
  addToReadLater: (itemId: string) => void;
  removeFromReadLater: (itemId: string) => void;
} => {
  return useFeedStore(
    useShallow(state => ({
      addToReadLater: state.addToReadLater,
      removeFromReadLater: state.removeFromReadLater,
    }))
  );
};

/**
 * Hook to get the count of unread items
 * @returns Number of unread items
 */
export const useUnreadCount = (): number => {
  return useFeedStore(state => {
    const readItems = state.readItems instanceof Set ? state.readItems : new Set();
    return state.feedItems.filter(item => !readItems.has(item.id)).length;
  });
};

/**
 * Hook to get feed items for a specific feed
 * Uses shallow equality to prevent re-renders when array content doesn't change
 * @param feedUrl - The URL of the feed to filter by
 * @returns Array of feed items for the specified feed
 */
export const useFeedItemsByFeed = (feedUrl: string): FeedItem[] => {
  return useFeedStore(
    useShallow(state => state.feedItems.filter(item => item.feedUrl === feedUrl))
  );
};

/**
 * Hook to get feed items for the active feed
 * @returns Array of feed items for the active feed, or all items if no active feed
 */
export const useActiveFeedItems = (): FeedItem[] => {
  return useFeedStore(
    useShallow(state => {
      const { feedItems, activeFeed } = state;
      if (!activeFeed) return feedItems;
      return feedItems.filter(item => item.feedUrl === activeFeed);
    })
  );
};

/**
 * Hook to get feed actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with feed-related actions
 */
export const useFeedActions = () => {
  return useFeedStore(
    useShallow(state => ({
      addFeed: state.addFeed,
      removeFeed: state.removeFeed,
      refreshFeeds: state.refreshFeeds,
      setActiveFeed: state.setActiveFeed,
      checkForUpdates: state.checkForUpdates,
    }))
  );
};

/**
 * Hook to get loading and refresh states
 * Uses shallow equality to prevent re-renders when values don't change
 * @returns Object with loading and refreshing states
 */
export const useLoadingStates = () => {
  return useFeedStore(
    useShallow(state => ({
      loading: state.loading,
      refreshing: state.refreshing,
      initialized: state.initialized,
    }))
  );
};

/**
 * Hook to check if the store is hydrated
 * @returns boolean indicating if the store is hydrated
 */
export const useIsHydrated = (): boolean => {
  return useFeedStore(state => state.hydrated);
};

/**
 * Hook to get all feeds
 * @returns Array of all feeds
 */
export const useFeeds = () => {
  return useFeedStore(state => state.feeds);
};

/**
 * Hook to get feed titles for search/command purposes
 * Uses shallow equality to prevent re-renders when titles don't change
 * @returns Array of objects with feed id and title
 */
export const useFeedTitles = () => {
  return useFeedStore(
    useShallow(state => state.feeds.map(feed => ({
      id: feed.feedUrl,  // Using feedUrl as id since Feed type doesn't have id
      title: feed.feedTitle,
      url: feed.feedUrl,
    })))
  );
};

/**
 * Hook to get unread items
 * @returns Array of unread feed items
 */
export const useUnreadItems = (): FeedItem[] => {
  return useFeedStore(
    useShallow(state => {
      const readItems = state.readItems instanceof Set ? state.readItems : new Set();
      return state.feedItems.filter(item => !readItems.has(item.id));
    })
  );
};

/**
 * Hook to get read later items
 * @returns Array of items marked for read later
 */
export const useReadLaterItems = (): FeedItem[] => {
  return useFeedStore(state => state.getReadLaterItems());
};

/**
 * Hook for the main web page data needs
 * Combines multiple selectors for optimal performance
 * @returns Object with all necessary data for the web page
 */
export const useWebPageData = () => {
  return useFeedStore(
    useShallow(state => ({
      feedItems: state.feedItems,
      loading: state.loading,
      refreshing: state.refreshing,
      initialized: state.initialized,
      hydrated: state.hydrated,
      refreshFeeds: state.refreshFeeds,
      setInitialized: state.setInitialized,
      getUnreadItems: state.getUnreadItems,
      setActiveFeed: state.setActiveFeed,
      getReadLaterItems: state.getReadLaterItems,
    }))
  );
};