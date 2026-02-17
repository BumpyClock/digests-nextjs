import {
  type QueryClient,
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { workerService } from "@/services/worker-service";
import { useFeedStore } from "@/store/useFeedStore";
import type { Feed, FeedItem } from "@/types";
import type { Subscription } from "@/types/subscription";
import { sortByDateDesc, toSubscription } from "@/store/selectors/feed-selectors";
import { type CacheData, mergeCacheData } from "./feed-cache-utils";
import { feedsKeys, getSubscriptionUrls, normalizeFeedUrl } from "./feedsKeys";

type FeedMutationContext = {
  previousSubscriptions: Subscription[];
  previousKey: QueryKey;
  previousData?: CacheData;
  normalizedFeedUrl?: string;
  nextKey?: QueryKey;
};

const readSubscriptionsSnapshot = () => useFeedStore.getState().subscriptions ?? [];

const getQueryKey = (subscriptionUrls: string[]) => feedsKeys.list(subscriptionUrls);

const setFeedCache = (queryClient: QueryClient, subscriptionUrls: string[], data: CacheData) => {
  queryClient.setQueryData<CacheData>(getQueryKey(subscriptionUrls), data);
};

const getFeedCache = (queryClient: QueryClient, subscriptionUrls: string[]) =>
  queryClient.getQueryData<CacheData>(getQueryKey(subscriptionUrls));

const invalidateFeedQuery = (queryClient: QueryClient, subscriptionUrls: string[]) => {
  queryClient.invalidateQueries({ queryKey: getQueryKey(subscriptionUrls) });
};

const toSubscriptionEntries = (feeds: Feed[]) => feeds.map((feed) => toSubscription(feed));

/**
 * Compares two query keys for equality.
 * Keys produced by feedsKeys.list() are 3-element string tuples
 * (["feeds", "list", stableHash]), so a simple JSON comparison suffices.
 */
const queryKeysDiffer = (a: QueryKey | undefined, b: QueryKey | undefined): boolean =>
  a !== b && JSON.stringify(a) !== JSON.stringify(b);

// Add single feed mutation
export const useAddFeedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; feeds: Feed[]; items: FeedItem[]; message?: string },
    Error,
    string,
    FeedMutationContext
  >({
    mutationFn: async (url: string) => {
      const result = await workerService.fetchFeeds(url);
      if (!result.success) {
        throw new Error(result.message || "Failed to add feed");
      }
      return result;
    },
    onMutate: async () => {
      const previousSubscriptions = [...readSubscriptionsSnapshot()];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });

      const previousData = getFeedCache(queryClient, previousUrls);
      return { previousSubscriptions, previousKey, previousData };
    },
    onSuccess: (result, _url, context) => {
      const store = useFeedStore.getState();
      const previousSubscriptions = context?.previousSubscriptions ?? [];
      const previousKey = context?.previousKey;

      store.addSubscriptions(toSubscriptionEntries(result.feeds));
      const nextSubscriptions = [...store.subscriptions];
      const nextUrls = getSubscriptionUrls(nextSubscriptions);
      const nextKey = getQueryKey(nextUrls);
      const nextData = mergeCacheData(context?.previousData, {
        feeds: result.feeds,
        items: result.items,
      });

      setFeedCache(queryClient, nextUrls, nextData);

      // Only invalidate if keys actually differ
      const keysDiffer = queryKeysDiffer(nextKey, previousKey);
      if (previousKey && keysDiffer) {
        invalidateFeedQuery(queryClient, getSubscriptionUrls(previousSubscriptions));
      }
      if (keysDiffer) {
        invalidateFeedQuery(queryClient, nextUrls);
      }
    },
    onError: (_error, _url, context) => {
      const previousSubscriptions = context?.previousSubscriptions;
      const previousKey = context?.previousKey;
      const previousData = context?.previousData;

      if (previousSubscriptions) {
        useFeedStore.getState().setSubscriptions(previousSubscriptions);
      }
      if (previousKey) {
        queryClient.setQueryData(previousKey, previousData);
      }
    },
  });
};

// Remove feed mutation
export const useRemoveFeedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ feedUrl: string }, Error, string, FeedMutationContext>({
    mutationFn: async (feedUrl: string) => ({ feedUrl }),
    onMutate: async (feedUrl) => {
      const previousSubscriptions = [...readSubscriptionsSnapshot()];
      const normalizedFeedUrl = normalizeFeedUrl(feedUrl);
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);
      const nextSubscriptions = previousSubscriptions.filter(
        (subscription) => normalizeFeedUrl(subscription.feedUrl) !== normalizedFeedUrl
      );
      const nextUrls = getSubscriptionUrls(nextSubscriptions);
      const nextKey = getQueryKey(nextUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });
      await queryClient.cancelQueries({ queryKey: nextKey });

      const previousData = getFeedCache(queryClient, previousUrls);
      const nextData = previousData
        ? {
            feeds: previousData.feeds.filter(
              (feed) => normalizeFeedUrl(feed.feedUrl) !== normalizedFeedUrl
            ),
            items: previousData.items.filter(
              (item) => normalizeFeedUrl(item.feedUrl) !== normalizedFeedUrl
            ),
          }
        : { feeds: [], items: [] };

      setFeedCache(queryClient, nextUrls, nextData);
      useFeedStore.getState().removeFeedSubscription(normalizedFeedUrl);

      return { previousSubscriptions, previousKey, previousData, nextKey, normalizedFeedUrl };
    },
    onSuccess: (_data, _feedUrl, context) => {
      const previousSubscriptions = context?.previousSubscriptions ?? [];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const normalizedFeedUrl = context?.normalizedFeedUrl ?? "";
      const nextUrls = previousUrls.filter((url) => url !== normalizedFeedUrl);

      if (previousUrls.length !== nextUrls.length) {
        invalidateFeedQuery(queryClient, previousUrls);
      }
      if (nextUrls.length) {
        invalidateFeedQuery(queryClient, nextUrls);
      } else {
        queryClient.removeQueries({ queryKey: getQueryKey(previousUrls) });
      }
    },
    onError: (_error, _feedUrl, context) => {
      const previousSubscriptions = context?.previousSubscriptions;
      const previousKey = context?.previousKey;
      const previousData = context?.previousData;
      const nextKey = context?.nextKey;

      if (previousSubscriptions) {
        useFeedStore.getState().setSubscriptions(previousSubscriptions);
      }
      if (previousKey) {
        queryClient.setQueryData(previousKey, previousData);
      }
      // Clean up the nextKey cache that was set optimistically
      if (nextKey) {
        queryClient.removeQueries({ queryKey: nextKey });
      }
    },
  });
};

// Manual refresh mutation for user-triggered refreshes
export const useRefreshFeedsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ feeds: Feed[]; items: FeedItem[] }, Error>({
    mutationFn: async () => {
      const feedUrls = getSubscriptionUrls(readSubscriptionsSnapshot());
      if (feedUrls.length === 0) {
        return { feeds: [], items: [] };
      }

      const result = await workerService.refreshFeeds(feedUrls);
      if (!result.success) {
        throw new Error(result.message || "Failed to refresh feeds");
      }

      return {
        feeds: result.feeds,
        items: [...result.items].sort(sortByDateDesc),
      };
    },
    onSuccess: (data) => {
      const feedUrls = getSubscriptionUrls(readSubscriptionsSnapshot());
      setFeedCache(queryClient, feedUrls, {
        feeds: data.feeds,
        items: data.items,
      });
    },
    onError: (error) => {
      console.error("Failed to refresh feeds:", error);
    },
  });
};

// Batch add feeds mutation for OPML import
export const useBatchAddFeedsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      feeds: Feed[];
      items: FeedItem[];
      successfulCount: number;
      failedCount: number;
      failedUrls: string[];
    },
    Error,
    string[],
    FeedMutationContext
  >({
    mutationFn: async (urls: string[]) => {
      const allFeeds: Feed[] = [];
      const allItems: FeedItem[] = [];
      const failedUrls: string[] = [];
      const CONCURRENCY = 5;

      for (let i = 0; i < urls.length; i += CONCURRENCY) {
        const batch = urls.slice(i, i + CONCURRENCY);
        try {
          const result = await workerService.fetchFeeds(batch);
          if (result.success) {
            allFeeds.push(...result.feeds);
            allItems.push(...result.items);
          } else {
            failedUrls.push(...batch);
          }
        } catch {
          failedUrls.push(...batch);
        }
      }

      return {
        feeds: allFeeds,
        items: allItems,
        successfulCount: urls.length - failedUrls.length,
        failedCount: failedUrls.length,
        failedUrls,
      };
    },
    onMutate: async () => {
      const previousSubscriptions = [...readSubscriptionsSnapshot()];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });
      const previousData = getFeedCache(queryClient, previousUrls);
      return { previousSubscriptions, previousKey, previousData };
    },
    onSuccess: (data, _url, context) => {
      // Use context instead of re-reading store for previous state
      const previousSubscriptions = context?.previousSubscriptions ?? [];
      const previousKey = context?.previousKey;
      const previousUrls = getSubscriptionUrls(previousSubscriptions);

      const store = useFeedStore.getState();
      store.addSubscriptions(toSubscriptionEntries(data.feeds));
      const nextSubscriptions = [...store.subscriptions];
      const nextUrls = getSubscriptionUrls(nextSubscriptions);
      const nextKey = getQueryKey(nextUrls);
      const nextData = mergeCacheData(context?.previousData, {
        feeds: data.feeds,
        items: data.items,
      });

      setFeedCache(queryClient, nextUrls, nextData);

      // Only invalidate if keys actually differ
      const keysDiffer = queryKeysDiffer(nextKey, previousKey);
      if (previousKey && keysDiffer) {
        invalidateFeedQuery(queryClient, previousUrls);
      }
      if (keysDiffer && nextUrls.length) {
        invalidateFeedQuery(queryClient, nextUrls);
      }
    },
    onError: (_error, _urls, context) => {
      const previousSubscriptions = context?.previousSubscriptions;
      if (previousSubscriptions) {
        useFeedStore.getState().setSubscriptions(previousSubscriptions);
      }
      if (context?.previousKey) {
        queryClient.setQueryData(context.previousKey, context.previousData);
      }
    },
  });
};
