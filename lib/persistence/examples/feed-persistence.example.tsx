/**
 * Example: How to use the persistence layer with feed queries
 * This demonstrates the migration from the current implementation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { apiService } from "@/services/api-service";
import { useFeedStore } from "@/store/useFeedStore";
import type { Feed, FeedItem } from "@/types";

// Query data type
interface FeedsQueryData {
  feeds: Feed[];
  items: FeedItem[];
}

// Query Keys Factory (unchanged)
export const feedsKeys = {
  all: ["feeds"] as const,
  lists: () => [...feedsKeys.all, "list"] as const,
  list: (filters: string[]) => [...feedsKeys.lists(), { filters }] as const,
  details: () => [...feedsKeys.all, "detail"] as const,
  detail: (id: string) => [...feedsKeys.details(), id] as const,
  sync: () => [...feedsKeys.all, "sync"] as const,
} as const;

/**
 * BEFORE: Current implementation with Zustand sync
 */
export const useFeedsQueryOld = () => {
  const query = useQuery({
    queryKey: feedsKeys.lists(),
    queryFn: async () => {
      // Fetches from API
      const existingFeeds = useFeedStore.getState().feeds;
      const feedUrls = existingFeeds.map((f) => f.feedUrl);
      const result = await apiService.refreshFeeds(feedUrls);
      return { feeds: result.feeds, items: result.items };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ❌ Problem: Manual sync to Zustand
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const store = useFeedStore.getState();
      store.setFeeds(query.data.feeds);
      store.setFeedItems(query.data.items);
    }
  }, [query.isSuccess, query.data]);

  return query;
};

/**
 * AFTER: New implementation with automatic persistence
 */
export const useFeedsQuery = () => {
  // ✅ No manual sync needed - persistence is automatic!
  return useQuery({
    queryKey: feedsKeys.lists(),
    queryFn: async () => {
      // Same API call
      const existingFeeds = await getPersistedFeeds(); // From IndexedDB if offline
      const feedUrls = existingFeeds.map((f) => f.feedUrl);

      if (feedUrls.length === 0) {
        return { feeds: [], items: [] };
      }

      const result = await apiService.refreshFeeds(feedUrls);
      return {
        feeds: result.feeds,
        items: sortItemsByDate(result.items),
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000, // Extended for offline support

    // ✅ New: Network mode for offline support
    networkMode: "offlineFirst",

    // ✅ New: Retry configuration for poor connectivity
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false; // Don't retry when offline
      return failureCount < 3;
    },

    // ✅ New: Background refetching
    refetchInterval: 30 * 60 * 1000,
    refetchIntervalInBackground: true,
  });
};

/**
 * Example: Accessing persisted data directly (for offline mode)
 */
async function getPersistedFeeds(): Promise<Feed[]> {
  const queryClient = useQueryClient();

  // Try to get from React Query cache first
  const cached = queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists());
  if (cached?.feeds) {
    return cached.feeds;
  }

  // If not in memory, it will be restored from IndexedDB automatically
  // by our persistence layer
  return [];
}

/**
 * Example: Optimistic updates with persistence
 */
export const useAddFeedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      return await apiService.fetchFeeds([url]);
    },

    // ✅ Optimistic update with automatic persistence
    onMutate: async (url) => {
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() });

      const previousData = queryClient.getQueryData<FeedsQueryData>(
        feedsKeys.lists(),
      );

      // Optimistically add a placeholder
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return { feeds: [], items: [] };

        return {
          ...old,
          feeds: [
            ...old.feeds,
            {
              feedUrl: url,
              title: "Loading...",
              link: url,
            } as Feed,
          ],
        };
      });

      return { previousData };
    },

    onError: (err, url, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData);
      }
    },

    onSuccess: (data) => {
      // Update with real data
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return { feeds: data.feeds, items: data.items };

        // Merge new data
        return mergeFeedData(old, data);
      });
    },
  });
};

/**
 * Example: UI State Management (remains in Zustand)
 */
export const useReadStatus = () => {
  // ✅ UI state stays in Zustand - no change needed
  // Note: useUIStore would need to be implemented or imported
  const readItems = new Set<string>(); // Mock implementation
  const markAsRead = (id: string) => {}; // Mock implementation

  return { readItems, markAsRead };
};

/**
 * Example: Combining server and UI state
 */
export const useUnreadItems = () => {
  const { data: feedsData } = useFeedsQuery();
  const { readItems } = useReadStatus();

  // ✅ Clean separation of concerns
  const unreadItems = useMemo(() => {
    if (!feedsData?.items) return [];

    return feedsData.items.filter((item) => !readItems.has(item.id));
  }, [feedsData?.items, readItems]);

  return unreadItems;
};

/**
 * Example: Offline indicator component
 */
export function OfflineIndicator() {
  // Note: useOfflineStatus would need to be implemented or imported
  const isOnline = navigator.onLine;
  const lastSync = Date.now();
  const isStale = false;

  if (isOnline && !isStale) return null;

  return (
    <div className="offline-indicator">
      {!isOnline && <span>Offline Mode</span>}
      {isStale && <span>Last synced: {formatTime(lastSync)}</span>}
    </div>
  );
}

/**
 * Example: Manual cache management
 */
export function CacheManager() {
  const queryClient = useQueryClient();

  const handleClearCache = async () => {
    // Clear React Query cache
    queryClient.clear();

    // Clear persisted data
    // await clearPersistedData() // Mock implementation - would need to be defined

    // Refetch active queries
    await queryClient.refetchQueries();
  };

  const handlePrefetch = async (feedUrls: string[]) => {
    // Prefetch feeds for offline use
    await queryClient.prefetchQuery({
      queryKey: feedsKeys.lists(),
      queryFn: () => apiService.fetchFeeds(feedUrls),
      staleTime: Infinity, // Don't refetch prefetched data
    });
  };

  return (
    <div>
      <button onClick={handleClearCache}>Clear Cache</button>
      <button onClick={() => handlePrefetch(["https://example.com/feed"])}>
        Download for Offline
      </button>
    </div>
  );
}

// Helper functions
function sortItemsByDate(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.published || a.pubDate || 0).getTime();
    const dateB = new Date(b.published || b.pubDate || 0).getTime();
    return dateB - dateA;
  });
}

function mergeFeedData(
  existing: FeedsQueryData,
  newData: Partial<FeedsQueryData>,
): FeedsQueryData {
  const existingFeedUrls = new Set(existing.feeds.map((f) => f.feedUrl));
  const existingItemIds = new Set(existing.items.map((i) => i.id));

  const newFeeds = (newData.feeds || []).filter(
    (f) => !existingFeedUrls.has(f.feedUrl),
  );
  const newItems = (newData.items || []).filter(
    (i) => !existingItemIds.has(i.id),
  );

  return {
    feeds: [...existing.feeds, ...newFeeds],
    items: sortItemsByDate([...existing.items, ...newItems]),
  };
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
