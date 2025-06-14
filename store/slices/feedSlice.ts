import type { Feed, FeedItem } from "@/types";
import { StateCreator } from "zustand";

// Simplified FeedSlice - server state is now handled by React Query
// This slice only manages local client state
type FeedSlice = {
  feeds: Feed[];
  setFeeds: (feeds: Feed[]) => void;
  removeFeedFromCache: (feedUrl: string) => void;
};

export const createFeedSlice: StateCreator<any, [], [], FeedSlice> = (set, get) => ({
  feeds: [] as Feed[],

  // Simple setter for feeds data (used during hydration)
  setFeeds: (feeds: Feed[]) => set({ feeds }),

  // Remove feed from local cache (used by React Query mutations for immediate UI updates)
  removeFeedFromCache: (feedUrl: string) => {
    const { feeds, feedItems, readItems, setFeedItems, sortFeedItemsByDate } = get();
    
    // Get all item IDs associated with this feed
    const feedItemIds = feedItems
      .filter((item: FeedItem) => item.feedUrl === feedUrl)
      .map((item: FeedItem) => item.id);
    
    // Create new Set without the removed feed's items
    const newReadItems = readItems instanceof Set ? new Set(readItems) : new Set();
    feedItemIds.forEach((id: string) => newReadItems.delete(id));
    
    // Filter out items from the removed feed and ensure consistent sorting
    const filteredItems = feedItems.filter((item: FeedItem) => item.feedUrl !== feedUrl);
    const sortedItems = sortFeedItemsByDate(filteredItems);
    
    // Update feeds and items using slice actions
    set({
      feeds: feeds.filter((f: Feed) => f.feedUrl !== feedUrl),
      readItems: newReadItems
    });
    
    // Use setFeedItems action for consistent state management
    setFeedItems(sortedItems);
  },
});