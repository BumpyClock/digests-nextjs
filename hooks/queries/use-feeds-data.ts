import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/services/worker-service";
import { useFeedStore } from "@/store/useFeedStore";
import { feedsKeys } from "./feedsKeys";
import { sortByDateDesc } from "@/utils/selectors";
import type { Feed, FeedItem } from "@/types";

/**
 * React Query hook for fetching and managing feeds data
 *
 * This replaces the Zustand-based data storage with React Query cache,
 * providing optimistic updates, background sync, and proper error handling.
 *
 * Features:
 * - Subscription-dependent query keys (invalidates when feed URLs change)
 * - Sorted items using select for performance optimization
 * - Aligned cache timing with worker TTL
 * - Proper error handling and loading states
 */
export function useFeedsData() {
  const feeds = useFeedStore((s) => s.feeds);
  const subs = useFeedStore((s) => s.subscriptions ?? []) as { feedUrl: string }[];
  const feedUrls = (feeds?.length ? feeds : subs).map((f) => f.feedUrl);

  return useQuery({
    queryKey: feedsKeys.list(feedUrls),
    queryFn: async (): Promise<{ feeds: Feed[]; items: FeedItem[] }> => {
      if (!feedUrls.length) {
        return { feeds: [], items: [] };
      }

      const result = await workerService.fetchFeeds(feedUrls);

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch feeds");
      }

      return {
        feeds: result.feeds,
        items: result.items,
      };
    },
    select: (data) => ({
      feeds: data.feeds,
      items: [...data.items].sort(sortByDateDesc), // Sort items by date (newest first)
    }),
    staleTime: 15 * 60 * 1000, // 15 minutes - align with worker TTL
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnReconnect: true, // Refetch when coming back online
    refetchOnWindowFocus: false, // Don't refetch on every window focus
    enabled: feedUrls.length > 0, // Only run if we have feeds to fetch
  });
}
