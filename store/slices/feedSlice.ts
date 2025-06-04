import type { Feed, FeedItem } from "@/types";
import { normalizeUrl } from "@/utils/url";
import { workerService } from "@/services/worker-service";
import { Logger } from "@/utils/logger";

import { StateCreator } from "zustand";

type FeedSlice = {
  feeds: Feed[];
  setFeeds: (feeds: Feed[]) => void;
  addFeed: (url: string) => Promise<{ success: boolean; message: string }>;
  removeFeed: (feedUrl: string) => void;
  addFeeds: (urls: string[]) => Promise<{ 
    successful: Array<{ url: string, message: string }>, 
    failed: Array<{ url: string, message: string }> 
  }>;
};

export const createFeedSlice: StateCreator<any, [], [], FeedSlice> = (set, get) => ({
  feeds: [] as Feed[],

  setFeeds: (feeds: Feed[]) => set({ feeds }),

  addFeed: async (url: string) => {
    set({ loading: true });
    const { feeds, feedItems, sortFeedItemsByDate } = get();
    
    // Check if feed already exists (protocol-agnostic)
    const normalizedNewUrl = normalizeUrl(url);
    const feedExists = feeds.some((f: Feed) => normalizeUrl(f.feedUrl) === normalizedNewUrl);
    
    if (feedExists) {
      set({ loading: false });
      return { 
        success: false, 
        message: "This feed is already in your subscriptions" 
      };
    }

    try {
      // Use worker service to fetch feed
      const result = await workerService.fetchFeeds(url);
      
      if (result.success && result.feeds.length > 0) {
        const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items]);
        set({
          feeds: [...feeds, ...result.feeds],
          feedItems: sortedItems,
        });
        return { 
          success: true, 
          message: `Added: ${result.feeds[0].feedTitle}`
        };
      } else {
        return {
          success: false,
          message: result.message || "Failed to add feed.",
        };
      }
    } catch (error: any) {
      const msg = error?.message || "Unknown error adding feed.";
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  removeFeed: (feedUrl: string) => {
    const { feeds, feedItems, readItems } = get();
    
    // Get all item IDs associated with this feed
    const feedItemIds = feedItems
      .filter((item: FeedItem) => item.feedUrl === feedUrl)
      .map((item: FeedItem) => item.id);
    
    // Create new Set without the removed feed's items
    const newReadItems = new Set(readItems);
    feedItemIds.forEach((id: string) => newReadItems.delete(id));
    
    set({
      feeds: feeds.filter((f: Feed) => f.feedUrl !== feedUrl),
      feedItems: feedItems.filter((item: FeedItem) => item.feedUrl !== feedUrl),
      readItems: newReadItems
    });
  },

  addFeeds: async (urls: string[]) => {
    set({ loading: true });
    const successful: Array<{ url: string, message: string }> = [];
    const failed: Array<{ url: string, message: string }> = [];
    
    // Process sequentially to avoid race conditions
    for (const url of urls) {
      try {
        // Get current state for each iteration
        const { feeds, feedItems, sortFeedItemsByDate } = get();
        
        // Check if this feed already exists (protocol-agnostic)
        const normalizedNewUrl = normalizeUrl(url);
        const feedExists = feeds.some((f: Feed) => normalizeUrl(f.feedUrl) === normalizedNewUrl);
        
        if (feedExists) {
          failed.push({ 
            url, 
            message: "This feed is already in your subscriptions" 
          });
          continue;
        }
        
        // Use worker service to fetch each feed
        const result = await workerService.fetchFeeds(url);
        
        if (result.success && result.feeds.length > 0) {
          // Update the store with this feed and its items
          const sortedItems = sortFeedItemsByDate([...feedItems, ...result.items]);
          set({
            feeds: [...feeds, ...result.feeds],
            feedItems: sortedItems,
          });
          successful.push({ 
            url, 
            message: `Added: ${result.feeds[0].feedTitle}` 
          });
        } else {
          failed.push({ 
            url, 
            message: result.message || "Failed to add feed." 
          });
        }
      } catch (error: any) {
        const msg = error?.message || "Unknown error adding feed.";
        failed.push({ url, message: msg });
      }
    }
    
    set({ loading: false });
    return { successful, failed };
  },
});