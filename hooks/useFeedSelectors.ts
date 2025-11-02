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
  markAllAsRead: (items: FeedItem[]) => void;
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
 * Hook to get feed actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with feed-related actions
 */
export const useFeedActions = () => {
  return useFeedStore(
    useShallow(state => ({
      setActiveFeed: state.setActiveFeed,
      removeFeedFromCache: state.removeFeedFromCache,
      // Server actions now handled by React Query
    }))
  );
};

/**
 * Hook to get client state (loading states now handled by React Query)
 * Uses shallow equality to prevent re-renders when values don't change
 * @returns Object with client state
 */
export const useClientStates = () => {
  return useFeedStore(
    useShallow(state => ({
      initialized: state.initialized,
      hydrated: state.hydrated,
      // Server loading states (loading, refreshing) now handled by React Query
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

export const useSubscriptions = () => {
  return useFeedStore((state: any) => state.subscriptions ?? []);
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
 * Hook for the main web page data needs
 * Combines multiple selectors for optimal performance
 * @returns Object with all necessary data for the web page
 */
export const useWebPageData = () => {
  return useFeedStore(
    useShallow(state => ({
      initialized: state.initialized,
      hydrated: state.hydrated,
      setInitialized: state.setInitialized,
      setActiveFeed: state.setActiveFeed,
      // Server state now handled by React Query
    }))
  );
};

/**
 * Hook to check if a specific audio item is currently playing
 * @param audioId - The ID of the audio item to check
 * @returns boolean indicating if the audio is currently playing
 */
export const useIsAudioPlaying = (audioId: string): boolean => {
  return useFeedStore(state => 
    state.currentAudio?.id === audioId && state.isPlaying
  );
};

/**
 * Hook to get audio playback actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with audio control functions
 */
export const useAudioActions = () => {
  return useFeedStore(
    useShallow(state => ({
      playAudio: state.playAudio,
      togglePlayPause: state.togglePlayPause,
      seek: state.seek,
      setVolume: state.setVolume,
      toggleMute: state.toggleMute,
      toggleMinimize: state.toggleMinimize,
    }))
  );
};

/**
 * Hook to get current audio info
 * @returns Current audio info or null
 */
export const useCurrentAudio = () => {
  return useFeedStore(state => state.currentAudio);
};

/**
 * Hook to get audio playback state
 * Uses shallow equality for efficient updates
 * @returns Object with playback state
 */
export const useAudioPlaybackState = () => {
  return useFeedStore(
    useShallow(state => ({
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
    }))
  );
};

/**
 * Hook to get audio UI state
 * @returns Object with UI state
 */
export const useAudioUIState = () => {
  return useFeedStore(
    useShallow(state => ({
      isMinimized: state.isMinimized,
      showMiniPlayer: state.showMiniPlayer,
    }))
  );
};
