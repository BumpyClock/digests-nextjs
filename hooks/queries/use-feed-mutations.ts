// ABOUTME: React Query mutations for feed operations with optimistic updates
// ABOUTME: Provides add, update, delete mutations with error recovery and offline sync

import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  apiService,
  CreateFeedDto,
  UpdateFeedDto,
  BatchCreateResponse,
} from "@/services/api-service";
// Legacy imports removed - React Query is permanent state management
import type { Feed, FeedItem } from "@/types";
// Feature flags removed - React Query feeds permanently enabled
import { Logger } from "@/utils/logger";
import { feedsKeys, type FeedsQueryData } from "./use-feeds";
import { toast } from "@/hooks/use-toast";
import { useSyncQueue, type SyncOperation } from "@/hooks/useSyncQueue";
import { useFeedStore } from "@/store/useFeedStore";
import { generateUUID } from "@/utils/uuid";

// Mutation operation types for offline sync
export type FeedMutationType =
  | "ADD_FEED"
  | "UPDATE_FEED"
  | "DELETE_FEED"
  | "REFRESH_FEED";

export interface FeedMutationOperation {
  type: FeedMutationType;
  data: unknown;
  timestamp: number;
  id: string;
}

// Context types for onMutate callbacks
interface FeedMutationContext {
  previousData?: FeedsQueryData;
}

interface UpdateFeedMutationContext {
  previousData?: FeedsQueryData;
}

interface DeleteFeedMutationContext {
  previousData?: FeedsQueryData;
}

/**
 * Add feed mutation with optimistic updates and offline support
 * Now uses batch parsing even for single feeds for consistency
 */
export const useAddFeed = (
  options?: UseMutationOptions<
    Feed,
    Error,
    CreateFeedDto,
    { previousData: FeedsQueryData | undefined }
  >,
) => {
  const queryClient = useQueryClient();
  const { addToQueue } = useSyncQueue(); // Call hook at top level
  // Legacy sync queue removed - React Query handles sync permanently
  const isFeatureEnabled = true; // React Query feeds permanently enabled
  const isOfflineEnabled = false; // Disabled during migration

  return useMutation({
    mutationFn: async (feedDto: CreateFeedDto) => {
      Logger.debug(
        "[useAddFeed] Adding feed using batch parsing:",
        feedDto.url,
      );

      // Add to offline queue if offline support is enabled
      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: "ADD_FEED",
          data: feedDto,
          timestamp: Date.now(),
          id: generateUUID(),
        };
        addToQueue(operation as SyncOperation); // Cast to match useSyncQueue type
      }

      // Use batch parsing even for single feeds for consistency
      const batchResult = await apiService.feeds.createBatch({
        urls: [feedDto.url],
      });

      if (batchResult.successfulCount === 0) {
        const error = batchResult.errors[0];
        throw new Error(error?.error || "Failed to add feed");
      }

      return batchResult.feeds[0];
    },
    onMutate: async (
      feedDto,
    ): Promise<{ previousData: FeedsQueryData | undefined }> => {
      if (!isFeatureEnabled) return { previousData: undefined };

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
    onSuccess: async (newFeed, _variables, _context) => {
      // Context is properly typed already
      Logger.debug("[useAddFeed] Successfully added feed:", newFeed.feedUrl);

      if (isFeatureEnabled) {
        // Since we're now using batch parsing, the feed and items are already available
        // We just need to update the cache to replace the optimistic feed with the real one
        queryClient.setQueryData<FeedsQueryData>(feedsKeys.lists(), (old) => {
          if (!old) return old;

          // Remove optimistic feed and update with real one
          const feeds = old.feeds.filter((f) => !f.guid.startsWith("temp-"));
          const existingFeedUrls = new Set(feeds.map((f) => f.feedUrl));

          // Add the new feed if it's not already present
          if (!existingFeedUrls.has(newFeed.feedUrl)) {
            feeds.push(newFeed);
          }

          return {
            ...old,
            feeds,
            lastFetched: Date.now(),
          };
        });

        toast({
          title: "Feed added successfully",
          description: `${newFeed.feedTitle || newFeed.siteTitle} has been added to your feeds.`,
        });
      } else {
        // Sync with Zustand
        const store = useFeedStore.getState();
        try {
          const result = await apiService.refreshFeeds([newFeed.feedUrl]);
          store.setFeeds([...store.feeds, ...result.feeds]);
          store.setFeedItems([...store.feedItems, ...result.items]);
        } catch (error) {
          Logger.error("[useAddFeed] Failed to sync with Zustand:", error);
        }
      }
    },
    onError: (error, variables, context) => {
      const typedContext = context as FeedMutationContext | undefined;
      Logger.error("[useAddFeed] Failed to add feed:", error);

      if (isFeatureEnabled && typedContext?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), typedContext.previousData);
      }

      toast({
        title: "Failed to add feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
    ...options,
  });
};

/**
 * Update feed mutation with optimistic updates
 */
export const useUpdateFeed = (
  options?: UseMutationOptions<
    Feed,
    Error,
    { id: string; data: UpdateFeedDto },
    { previousData: FeedsQueryData | undefined }
  >,
) => {
  const queryClient = useQueryClient();
  const { addToQueue } = useSyncQueue(); // Call hook at top level
  // Legacy sync queue removed - React Query handles sync permanently
  const isFeatureEnabled = true; // React Query feeds permanently enabled
  const isOfflineEnabled = false; // Disabled during migration

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFeedDto }) => {
      Logger.debug("[useUpdateFeed] Updating feed:", id, data);

      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: "UPDATE_FEED",
          data: { id, ...data },
          timestamp: Date.now(),
          id: generateUUID(),
        };
        addToQueue(operation as SyncOperation); // Cast to match useSyncQueue type
      }

      // Note: Current API doesn't support updates, so we handle it client-side
      return { id, ...data } as Feed;
    },
    onMutate: async ({
      id,
      data,
    }): Promise<{ previousData: FeedsQueryData | undefined }> => {
      if (!isFeatureEnabled) return { previousData: undefined };

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
    onSuccess: (updatedFeed, variables) => {
      Logger.debug("[useUpdateFeed] Successfully updated feed:", variables.id);

      toast({
        title: "Feed updated",
        description: "Feed settings have been updated successfully.",
      });
    },
    onError: (error, variables, context) => {
      const typedContext = context as UpdateFeedMutationContext | undefined;
      Logger.error("[useUpdateFeed] Failed to update feed:", error);

      if (isFeatureEnabled && typedContext?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), typedContext.previousData);
      }

      toast({
        title: "Failed to update feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
    ...options,
  });
};

/**
 * Delete feed mutation with optimistic updates
 */
export const useDeleteFeed = (
  options?: UseMutationOptions<
    string,
    Error,
    string,
    { previousData: FeedsQueryData | undefined }
  >,
) => {
  const queryClient = useQueryClient();
  const { addToQueue } = useSyncQueue(); // Call hook at top level
  // Legacy sync queue removed - React Query handles sync permanently
  const isFeatureEnabled = true; // React Query feeds permanently enabled
  const isOfflineEnabled = false; // Disabled during migration

  return useMutation({
    mutationFn: async (feedUrl: string) => {
      Logger.debug("[useDeleteFeed] Deleting feed:", feedUrl);

      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: "DELETE_FEED",
          data: { feedUrl },
          timestamp: Date.now(),
          id: generateUUID(),
        };
        addToQueue(operation as SyncOperation); // Cast to match useSyncQueue type
      }

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
    onMutate: async (
      feedUrl,
    ): Promise<{ previousData: FeedsQueryData | undefined }> => {
      if (!isFeatureEnabled) return { previousData: undefined };

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

      if (!isFeatureEnabled) {
        // Sync with Zustand
        const store = useFeedStore.getState();
        store.removeFeedFromCache(feedUrl);
      }

      toast({
        title: "Feed removed",
        description: "Feed has been removed from your list.",
      });
    },
    onError: (error, variables, context) => {
      const typedContext = context as DeleteFeedMutationContext | undefined;
      Logger.error("[useDeleteFeed] Failed to delete feed:", error);

      if (isFeatureEnabled && typedContext?.previousData) {
        queryClient.setQueryData(feedsKeys.lists(), typedContext.previousData);
      }

      toast({
        title: "Failed to remove feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
    ...options,
  });
};

/**
 * Refresh single feed mutation
 */
export const useRefreshFeed = (
  options?: UseMutationOptions<
    { feedId: string; items: FeedItem[] },
    Error,
    string
  >,
) => {
  const queryClient = useQueryClient();
  const { addToQueue } = useSyncQueue(); // Call hook at top level
  // Legacy sync queue removed - React Query handles sync permanently
  const isOfflineEnabled = false; // Disabled during migration

  return useMutation({
    mutationFn: async (feedId: string) => {
      Logger.debug("[useRefreshFeed] Refreshing feed:", feedId);

      if (isOfflineEnabled) {
        const operation: FeedMutationOperation = {
          type: "REFRESH_FEED",
          data: { feedId },
          timestamp: Date.now(),
          id: generateUUID(),
        };
        addToQueue(operation as SyncOperation); // Cast to match useSyncQueue type
      }

      const items = await apiService.feeds.refresh(feedId);
      return { feedId, items };
    },
    onSuccess: ({ feedId, items }) => {
      Logger.debug("[useRefreshFeed] Successfully refreshed feed:", feedId);

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

      toast({
        title: "Feed refreshed",
        description: "Latest articles have been fetched.",
      });
    },
    onError: (error) => {
      Logger.error("[useRefreshFeed] Failed to refresh feed:", error);

      toast({
        title: "Failed to refresh feed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    ...options,
  });
};

/**
 * Refresh all feeds mutation
 */
export const useRefreshAllFeeds = (
  options?: UseMutationOptions<
    { feeds: Feed[]; items: FeedItem[] },
    Error,
    void
  >,
) => {
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

      toast({
        title: "All feeds refreshed",
        description: `Updated ${data.feeds.length} feeds with latest articles.`,
      });
    },
    onError: (error) => {
      Logger.error("[useRefreshAllFeeds] Failed to refresh all feeds:", error);

      toast({
        title: "Failed to refresh feeds",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    ...options,
  });
};

/**
 * Batch add feeds mutation (for OPML import)
 * Now uses true batch parsing with a single API request
 */
export const useBatchAddFeeds = (
  options?: UseMutationOptions<BatchCreateResponse, Error, string[]>,
) => {
  const queryClient = useQueryClient();
  const isFeatureEnabled = true; // React Query feeds permanently enabled

  return useMutation({
    mutationFn: async (urls: string[]) => {
      Logger.debug(
        "[useBatchAddFeeds] Batch adding feeds using single API request:",
        urls.length,
      );

      // Use the new batch create method that makes a single /parse request
      const results = await apiService.feeds.createBatch({ urls });

      Logger.debug(
        `[useBatchAddFeeds] Batch completed: ${results.successfulCount} successful, ${results.failedCount} failed`,
      );

      return results;
    },
    onSuccess: (data) => {
      Logger.debug("[useBatchAddFeeds] Batch add completed:", {
        successful: data.successfulCount,
        failed: data.failedCount,
        errors: data.errors,
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
            items: [...old.items, ...newItems].sort((a, b) => {
              const dateA = new Date(a.published || a.pubDate || 0).getTime();
              const dateB = new Date(b.published || b.pubDate || 0).getTime();
              return dateB - dateA;
            }),
            lastFetched: Date.now(),
          };
        });
      } else {
        // Sync with Zustand
        const store = useFeedStore.getState();
        store.setFeeds([...store.feeds, ...data.feeds]);
        store.setFeedItems([...store.feedItems, ...data.items]);
      }

      // Show detailed success/failure summary
      if (data.failedCount > 0) {
        Logger.warn("[useBatchAddFeeds] Some feeds failed:", data.errors);
        toast({
          title: "Batch import completed with warnings",
          description: `${data.successfulCount} feeds added successfully, ${data.failedCount} failed. Check console for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch import completed",
          description: `Successfully added ${data.successfulCount} feeds.`,
        });
      }

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
    onError: (error) => {
      Logger.error("[useBatchAddFeeds] Batch add failed:", error);

      toast({
        title: "Batch import failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
    ...options,
  });
};
