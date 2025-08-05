// ABOUTME: Enhanced React Query hooks for feed state management with offline sync
// ABOUTME: Provides comprehensive feed operations with optimistic updates and error recovery

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  apiService,
  CreateFeedDto,
  UpdateFeedDto,
} from "@/services/api-service";
// Zustand store removed - React Query is permanent
import type { Feed, FeedItem } from "@/types";
import { useCallback } from "react";
// Feature flags removed - React Query is permanently enabled
import { Logger } from "@/utils/logger";

// Query data types
export interface FeedsQueryData {
  feeds: Feed[];
  items: FeedItem[];
  lastFetched: number;
}

interface SingleFeedQueryData {
  feed: Feed;
  items: FeedItem[];
}

// Query Keys Factory
export const feedsKeys = {
  all: ["feeds"] as const,
  lists: () => [...feedsKeys.all, "list"] as const,
  list: (filters?: string[]) => [...feedsKeys.lists(), { filters }] as const,
  details: () => [...feedsKeys.all, "detail"] as const,
  detail: (id: string) => [...feedsKeys.details(), id] as const,
  items: () => [...feedsKeys.all, "items"] as const,
  itemsByFeed: (feedUrl: string) =>
    [...feedsKeys.items(), { feedUrl }] as const,
  sync: () => [...feedsKeys.all, "sync"] as const,
} as const;

/**
 * Main feeds query hook with persistence and caching
 */
export const useFeeds = (
  options?: Omit<UseQueryOptions<FeedsQueryData>, "queryKey" | "queryFn">,
) => {
  const queryClient = useQueryClient();
  // Legacy Zustand store references removed
  const isFeatureEnabled = true; // React Query feeds permanently enabled

  // React Query is the permanent data source
  const existingFeeds =
    queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())?.feeds || [];

  const query = useQuery<FeedsQueryData>({
    queryKey: feedsKeys.lists(),
    queryFn: async () => {
      Logger.debug("[useFeeds] Fetching feeds");

      // Get existing feeds from determined source
      const feedsToRefresh = existingFeeds;

      const feedUrls = feedsToRefresh.map((f) => f.feedUrl);

      if (feedUrls.length === 0) {
        return { feeds: [], items: [], lastFetched: Date.now() };
      }

      const result = await apiService.refreshFeeds(feedUrls);

      // Sort items by date (newest first)
      const sortedItems = result.items.sort((a, b) => {
        const dateA = new Date(a.published || a.pubDate || 0).getTime();
        const dateB = new Date(b.published || b.pubDate || 0).getTime();
        return dateB - dateA;
      });

      return {
        feeds: result.feeds,
        items: sortedItems,
        lastFetched: Date.now(),
      };
    },
    enabled: isFeatureEnabled && existingFeeds.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 60 * 60 * 1000, // 1 hour cache time
    refetchInterval: false, // 30 minutes if background sync enabled
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: "always",
    networkMode: "online",
    ...options,
  });

  return {
    ...query,
    feeds: query.data?.feeds || [],
    items: query.data?.items || [],
    lastFetched: query.data?.lastFetched,
    // Enhanced status indicators
    isStale: query.isStale,
    isFetching: query.isFetching,
    isBackgroundFetching: query.isFetching && !query.isLoading,
  };
};

// Individual feed query removed - use useFeed from './use-feed' instead

/**
 * Add feed mutation with optimistic updates
 */
export const useAddFeed = () => {
  const queryClient = useQueryClient();
  const isFeatureEnabled = true;

  return useMutation({
    mutationFn: async (feedDto: CreateFeedDto) => {
      Logger.debug("[useAddFeed] Adding feed:", feedDto.url);
      return await apiService.feeds.create(feedDto);
    },
    onMutate: async (feedDto) => {
      if (!isFeatureEnabled) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<FeedsQueryData>(
        feedsKeys.lists(),
      );

      // Optimistically update with placeholder
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old;

        const optimisticFeed: Feed = {
          type: "feed",
          guid: `temp-${Date.now()}`,
          status: "pending",
          siteTitle: feedDto.url,
          siteName: feedDto.url,
          feedTitle: "Loading...",
          feedUrl: feedDto.url,
          description: "",
          link: feedDto.url,
          lastUpdated: new Date().toISOString(),
          lastRefreshed: new Date().toISOString(),
          published: new Date().toISOString(),
          author: null,
          language: "",
          favicon: "",
          categories: [],
        };

        return {
          ...old,
          feeds: [...old.feeds, optimisticFeed],
        };
      });

      return { previousData };
    },
    onSuccess: async (newFeed, variables, context) => {
      Logger.debug("[useAddFeed] Successfully added feed:", newFeed.feedUrl);

      if (isFeatureEnabled) {
        // Fetch feed items immediately
        const result = await apiService.refreshFeeds([newFeed.feedUrl]);

        // Update cache with real data
        queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
          if (!old)
            return {
              feeds: result.feeds,
              items: result.items,
              lastFetched: Date.now(),
            };

          // Remove optimistic feed and add real one
          const feeds = old.feeds.filter((f) => !f.guid.startsWith("temp-"));
          const existingFeedUrls = new Set(feeds.map((f) => f.feedUrl));
          const existingItemIds = new Set(old.items.map((i) => i.id));

          const newFeeds = result.feeds.filter(
            (f) => !existingFeedUrls.has(f.feedUrl),
          );
          const newItems = result.items.filter(
            (i) => !existingItemIds.has(i.id),
          );

          return {
            feeds: [...feeds, ...newFeeds],
            items: [...old.items, ...newItems],
            lastFetched: Date.now(),
          };
        });
      }
      // Zustand store integration removed - React Query is permanent
    },
    onError: (error, variables, context) => {
      Logger.error("[useAddFeed] Failed to add feed:", error);

      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
  });
};

/**
 * Update feed mutation
 */
export const useUpdateFeed = () => {
  const queryClient = useQueryClient();
  const isFeatureEnabled = true;

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFeedDto }) => {
      Logger.debug("[useUpdateFeed] Updating feed:", id, data);
      // Note: Current API doesn't support updates, so we handle it client-side
      return { id, ...data };
    },
    onMutate: async ({ id, data }) => {
      if (!isFeatureEnabled) return;

      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() });

      const previousData = queryClient.getQueryData<FeedsQueryData>(
        feedsKeys.lists(),
      );

      // Optimistically update
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old;

        return {
          ...old,
          feeds: old.feeds.map((feed) =>
            feed.guid === id ? { ...feed, ...data } : feed,
          ),
        };
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      Logger.error("[useUpdateFeed] Failed to update feed:", error);

      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
  });
};

/**
 * Delete feed mutation with optimistic updates
 */
export const useDeleteFeed = () => {
  const queryClient = useQueryClient();
  const isFeatureEnabled = true;

  return useMutation({
    mutationFn: async (feedUrl: string) => {
      Logger.debug("[useDeleteFeed] Deleting feed:", feedUrl);
      // Find the feed to get its ID
      const feeds =
        queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())?.feeds ||
        [];
      const feed = feeds.find((f) => f.feedUrl === feedUrl);
      if (feed) {
        await apiService.feeds.delete(feed.guid);
      }
      return feedUrl;
    },
    onMutate: async (feedUrl) => {
      if (!isFeatureEnabled) return;

      await queryClient.cancelQueries({ queryKey: feedsKeys.lists() });

      const previousData = queryClient.getQueryData<FeedsQueryData>(
        feedsKeys.lists(),
      );

      // Optimistically remove
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old;

        return {
          ...old,
          feeds: old.feeds.filter((f) => f.feedUrl !== feedUrl),
          items: old.items.filter((i) => i.feedUrl !== feedUrl),
        };
      });

      return { previousData };
    },
    onSuccess: (feedUrl) => {
      Logger.debug("[useDeleteFeed] Successfully deleted feed:", feedUrl);
      // Zustand store integration removed - React Query is permanent
    },
    onError: (error, variables, context) => {
      Logger.error("[useDeleteFeed] Failed to delete feed:", error);

      if (isFeatureEnabled && context?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
  });
};

/**
 * Refresh single feed mutation
 */
export const useRefreshFeed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      Logger.debug("[useRefreshFeed] Refreshing feed:", feedId);
      const items = await apiService.feeds.refresh(feedId);
      return { feedId, items };
    },
    onSuccess: ({ feedId, items }) => {
      // Update the feed's items in the cache
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
        if (!old) return old;

        const feed = old.feeds.find((f) => f.guid === feedId);
        if (!feed) return old;

        // Remove old items for this feed and add new ones
        const otherItems = old.items.filter((i) => i.feedUrl !== feed.feedUrl);

        return {
          ...old,
          items: [...otherItems, ...items].sort((a, b) => {
            const dateA = new Date(a.published || a.pubDate || 0).getTime();
            const dateB = new Date(b.published || b.pubDate || 0).getTime();
            return dateB - dateA;
          }),
          lastFetched: Date.now(),
        };
      });
    },
  });
};

/**
 * Refresh all feeds mutation
 */
export const useRefreshAllFeeds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      Logger.debug("[useRefreshAllFeeds] Refreshing all feeds");

      const feeds =
        queryClient.getQueryData<FeedsQueryData>(feedsKeys.lists())?.feeds ||
        [];
      const feedUrls = feeds.map((f) => f.feedUrl);

      if (feedUrls.length === 0) {
        return { feeds: [], items: [] };
      }

      const result = await apiService.refreshFeeds(feedUrls);

      // Sort items by date
      const sortedItems = result.items.sort((a, b) => {
        const dateA = new Date(a.published || a.pubDate || 0).getTime();
        const dateB = new Date(b.published || b.pubDate || 0).getTime();
        return dateB - dateA;
      });

      return { feeds: result.feeds, items: sortedItems };
    },
    onSuccess: (data) => {
      Logger.debug("[useRefreshAllFeeds] Successfully refreshed all feeds");

      // Update cache with fresh data
      queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), {
        feeds: data.feeds,
        items: data.items,
        lastFetched: Date.now(),
      });
    },
  });
};

/**
 * Batch add feeds mutation (for OPML import)
 */
export const useBatchAddFeeds = () => {
  const queryClient = useQueryClient();
  const isFeatureEnabled = true;

  return useMutation({
    mutationFn: async (urls: string[]) => {
      Logger.debug("[useBatchAddFeeds] Adding feeds:", urls.length);

      const results = {
        feeds: [] as Feed[],
        items: [] as FeedItem[],
        successfulCount: 0,
        failedCount: 0,
        failedUrls: [] as string[],
      };

      // Process URLs sequentially to avoid overwhelming the API
      for (const url of urls) {
        try {
          const feed = await apiService.feeds.create({ url });
          const feedData = await apiService.refreshFeeds([feed.feedUrl]);

          results.feeds.push(...feedData.feeds);
          results.items.push(...feedData.items);
          results.successfulCount++;
        } catch (error) {
          Logger.error(`[useBatchAddFeeds] Failed to add feed ${url}:`, error);
          results.failedUrls.push(url);
          results.failedCount++;
        }
      }

      return results;
    },
    onSuccess: (data) => {
      Logger.debug("[useBatchAddFeeds] Batch add completed:", {
        successful: data.successfulCount,
        failed: data.failedCount,
      });

      if (isFeatureEnabled) {
        // Update cache
        queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
          if (!old)
            return {
              feeds: data.feeds,
              items: data.items,
              lastFetched: Date.now(),
            };

          // Deduplicate
          const existingFeedUrls = new Set(old.feeds.map((f) => f.feedUrl));
          const existingItemIds = new Set(old.items.map((i) => i.id));

          const newFeeds = data.feeds.filter(
            (f) => !existingFeedUrls.has(f.feedUrl),
          );
          const newItems = data.items.filter((i) => !existingItemIds.has(i.id));

          return {
            feeds: [...old.feeds, ...newFeeds],
            items: [...old.items, ...newItems],
            lastFetched: Date.now(),
          };
        });
      }
      // Zustand store integration removed - React Query is permanent

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
  });
};

/**
 * Prefetch feeds for better UX
 */
export const usePrefetchFeeds = () => {
  const queryClient = useQueryClient();

  const prefetchFeeds = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: feedsKeys.lists(),
      queryFn: async () => {
        const result = await apiService.feeds.getAll();
        return {
          feeds: result,
          items: [],
          lastFetched: Date.now(),
        };
      },
      staleTime: 1 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetchFeeds };
};
