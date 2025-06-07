import type { Feed, FeedItem } from "@/types";
import { StateCreator } from "zustand";

// Simplified FeedSlice - server state is now handled by React Query
// This slice only manages client-side synchronization and local state
type FeedSlice = {
  feeds: Feed[];
  setFeeds: (feeds: Feed[]) => void;
  syncFeedsFromQuery: (feeds: Feed[], items: FeedItem[]) => void;
  removeFeedFromCache: (feedUrl: string) => void;
};

export const createFeedSlice: StateCreator<any, [], [], FeedSlice> = (set, get) => ({
  feeds: [] as Feed[],

  // Simple setter for feeds data (used during hydration and initial load)
  setFeeds: (feeds: Feed[]) => set({ feeds }),

  // Sync feeds and items from React Query to Zustand (for components still using Zustand)
  syncFeedsFromQuery: (feeds: Feed[], items: FeedItem[]) => {
    const { sortFeedItemsByDate } = get();
    const sortedItems = sortFeedItemsByDate ? sortFeedItemsByDate(items) : items;
    
    set({
      feeds,
      feedItems: sortedItems,
    });
  },

  // Remove feed from local cache (used by React Query mutations for immediate UI updates)
  removeFeedFromCache: (feedUrl: string) => {
    const { feeds, feedItems, readItems } = get();
    
    // Get all item IDs associated with this feed
    const feedItemIds = feedItems
      .filter((item: FeedItem) => item.feedUrl === feedUrl)
      .map((item: FeedItem) => item.id);
    
    // Create new Set without the removed feed's items
    const newReadItems = readItems instanceof Set ? new Set(readItems) : new Set();
    feedItemIds.forEach((id: string) => newReadItems.delete(id));
    
    set({
      feeds: feeds.filter((f: Feed) => f.feedUrl !== feedUrl),
      feedItems: feedItems.filter((item: FeedItem) => item.feedUrl !== feedUrl),
      readItems: newReadItems
    });
  },
});