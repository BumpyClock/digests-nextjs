import type { FeedItem } from "@/types";
import { StateCreator } from "zustand";

type ItemsSlice = {
  feedItems: FeedItem[];
  setFeedItems: (items: FeedItem[]) => void;
  sortFeedItemsByDate: (items: FeedItem[]) => FeedItem[];
};

export const createItemsSlice: StateCreator<any, [], [], ItemsSlice> = (set, get) => ({
  feedItems: [] as FeedItem[],

  setFeedItems: (items: FeedItem[]) => set({ feedItems: items }),

  sortFeedItemsByDate: (items: FeedItem[]): FeedItem[] => {
    return [...items].sort(
      (a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime()
    );
  },
});