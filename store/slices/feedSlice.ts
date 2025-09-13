import type { Feed } from "@/types";
import type { Subscription } from "@/types/subscription";
import { toSubscription } from "@/utils/selectors";
import { StateCreator } from "zustand";

// Simplified FeedSlice - server state is now handled by React Query
// This slice only manages local client state
type FeedSlice = {
  // Runtime list of full feeds (not persisted)
  feeds: Feed[];
  // Lightweight subscriptions (persisted)
  subscriptions: Subscription[];
  setFeeds: (feeds: Feed[]) => void;
  removeFeedFromCache: (feedUrl: string) => void;
};

export const createFeedSlice: StateCreator<any, [], [], FeedSlice> = (set, get) => ({
  feeds: [] as Feed[],
  subscriptions: [] as Subscription[],

  // Setter for feeds also updates lightweight subscriptions (persisted)
  setFeeds: (feeds: Feed[]) => set({ 
    feeds, 
    subscriptions: feeds.map(toSubscription)
  }),

  // Remove feed from local cache (used by React Query mutations for immediate UI updates)
  removeFeedFromCache: (feedUrl: string) => {
    const { feeds } = get();
    // With React Query as source of truth, only update the local subscriptions list here.
    const nextFeeds = feeds.filter((f: Feed) => f.feedUrl !== feedUrl)
    set({
      feeds: nextFeeds,
      subscriptions: nextFeeds.map(toSubscription)
    });
  },
});
