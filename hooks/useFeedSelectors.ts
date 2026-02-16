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
  return useFeedStore((state) => state.readItems.has(itemId));
};

/**
 * Hook to check if a specific item is in the read later list
 * @param itemId - The ID of the item to check
 * @returns boolean indicating if the item is in read later
 */
export const useIsInReadLater = (itemId: string): boolean => {
  return useFeedStore((state) => state.readLaterItems.has(itemId));
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
    useShallow((state) => ({
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
    useShallow((state) => ({
      addToReadLater: state.addToReadLater,
      removeFromReadLater: state.removeFromReadLater,
    }))
  );
};

/**
 * Hook to get all feeds
 * @returns Array of all feeds
 */
export const useFeeds = () => {
  return useFeedStore((state) => state.subscriptions);
};

export const useSubscriptions = () => {
  return useFeedStore((state) => state.subscriptions ?? []);
};

/**
 * Hook for the main web page data needs
 * Combines multiple selectors for optimal performance
 * @returns Object with all necessary data for the web page
 */
export const useWebPageData = () => {
  return useFeedStore(
    useShallow((state) => ({
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
  return useFeedStore((state) => state.currentAudio?.id === audioId && state.isPlaying);
};

/**
 * Hook to get audio playback actions
 * Uses shallow equality to prevent re-renders when functions don't change
 * @returns Object with audio control functions
 */
export const useAudioActions = () => {
  return useFeedStore(
    useShallow((state) => ({
      playAudio: state.playAudio,
      togglePlayPause: state.togglePlayPause,
      seek: state.seek,
      setVolume: state.setVolume,
      toggleMute: state.toggleMute,
      toggleMinimize: state.toggleMinimize,
    }))
  );
};
