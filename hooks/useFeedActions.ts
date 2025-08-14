/**
 * Feed actions hook (replacement for useFeedSelectors)
 *
 * This hook provides all the feed-related actions and state selectors
 * that were previously in useFeedSelectors, now using React Query
 * and the new React hook-based state management.
 */

import { useFeeds as useFeedsQuery } from "@/hooks/queries/use-feeds";
import { useReadStatus } from "@/hooks/useReadStatus";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { Feed } from "@/types";

export function useFeeds(): Feed[] {
  const { data } = useFeedsQuery();
  return data?.feeds || [];
}

export function useReadActions() {
  const { markAsRead, markAsUnread, markAllAsRead, toggleReadStatus } =
    useReadStatus();

  return {
    markAsRead,
    markAsUnread,
    markAllAsRead,
    toggleReadStatus,
  };
}

export function useReadLaterActions() {
  const {
    addToReadLater,
    removeFromReadLater,
    toggleReadLater,
    isInReadLater,
  } = useReadStatus();

  return {
    addToReadLater,
    removeFromReadLater,
    toggleReadLater,
    isInReadLater,
  };
}

export function useIsItemRead(itemId: string) {
  const { readItems } = useReadStatus();

  return readItems.has(itemId);
}

export function useIsInReadLater(itemId: string) {
  const { isInReadLater } = useReadStatus();
  return isInReadLater(itemId);
}

export function useAudioActions() {
  const { playAudio } = useAudioPlayer();

  return {
    playAudio,
  };
}

export function useIsAudioPlaying(itemId: string) {
  const { isPlaying, currentAudio } = useAudioPlayer();

  return isPlaying && currentAudio?.id === itemId;
}

// Additional feed-related utilities
export function useFeedFilter() {
  const feeds = useFeeds();

  return {
    filteredFeeds: feeds,
    setFilter: () => {}, // Placeholder - implement if needed
  };
}

export function useBookmarkActions() {
  const { toggleReadLater, isInReadLater } = useReadStatus();

  return {
    toggleBookmark: toggleReadLater,
    isBookmarked: isInReadLater,
  };
}

// Web page data utilities (replacement for useWebPageData)
export function useWebPageData() {
  const { isLoaded } = useReadStatus();
  const { getReadLaterItems } = useReadStatus();

  return {
    hydrated: isLoaded,
    initialized: isLoaded,
    setInitialized: () => {},
    setActiveFeed: () => {},
    getReadLaterItems,
  };
}
