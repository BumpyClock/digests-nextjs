import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/services/worker-service";
import { useFeedStore } from "@/store/useFeedStore";
import type { Feed, FeedItem } from "@/types";
import { sortByDateDesc } from "@/utils/selectors";
import { feedsKeys } from "./feedsKeys";

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
  const subscriptions = useFeedStore((s) => s.subscriptions ?? []);
  const feedUrls = subscriptions.map((f) => f.feedUrl);

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
        items: [...result.items].sort(sortByDateDesc), // Sort once at fetch time
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - uses worker cache for dedup within this window
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in React Query cache after going unused
    refetchOnReconnect: true, // Refetch when coming back online
    refetchOnWindowFocus: false, // Don't refetch on every window focus
    enabled: feedUrls.length > 0, // Only run if we have feeds to fetch
  });
}
