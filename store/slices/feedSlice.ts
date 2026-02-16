import { StateCreator } from "zustand";
import type { Feed } from "@/types";
import type { Subscription } from "@/types/subscription";
import { toSubscription } from "@/utils/selectors";

type FeedInput = Feed | Subscription;

// Simplified FeedSlice - server state is now handled by React Query
// This slice only manages local client state
export type FeedSlice = {
  // Lightweight subscriptions (persisted)
  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: FeedInput[]) => void;
  addSubscriptions: (subscriptions: FeedInput[]) => void;
  removeFeedSubscription: (feedUrl: string) => void;
};

export const createFeedSlice: StateCreator<FeedSlice, [], [], FeedSlice> = (set, get) => ({
  subscriptions: [] as Subscription[],

  setSubscriptions: (subscriptions: FeedInput[]) =>
    set({
      subscriptions: Array.from(
        new Map(
          (subscriptions ?? [])
            .map((entry) => toSubscription(entry))
            .map((entry) => [entry.feedUrl, entry])
        ).values()
      ),
    }),

  addSubscriptions: (subscriptions: FeedInput[]) => {
    const current = get().subscriptions;
    const nextMap = new Map(current.map((entry) => [entry.feedUrl, entry]));
    for (const entry of subscriptions) {
      const normalized = toSubscription(entry);
      if (normalized.feedUrl) {
        nextMap.set(normalized.feedUrl, normalized);
      }
    }

    set({
      subscriptions: Array.from(nextMap.values()),
    });
  },

  removeFeedSubscription: (feedUrl: string) => {
    set({
      subscriptions: get().subscriptions.filter((subscription) => subscription.feedUrl !== feedUrl),
    });
  },
});
