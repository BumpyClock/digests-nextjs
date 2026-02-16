import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { Feed, FeedItem } from "@/types";
import { toSubscription } from "@/utils/selectors";
import { workerService } from "@/services/worker-service";
import { useFeedStore } from "@/store/useFeedStore";
import type { Subscription } from "@/types/subscription";
import { feedsKeys } from "./feedsKeys";
import { sortByDateDesc } from "@/utils/selectors";
import { mergeCacheData, type CacheData } from "./feed-cache-utils";

type FeedMutationContext = {
  previousSubscriptions: Subscription[];
  previousKey: QueryKey;
  previousData?: CacheData;
};

const getSubscriptions = () => useFeedStore.getState().subscriptions ?? [];
const normalizeUrl = (url: string | undefined) => (url || "").trim().toLowerCase();

const getSubscriptionUrls = (subscriptions: Subscription[] | undefined) =>
  Array.from(new Set((subscriptions ?? []).map((s) => normalizeUrl(s.feedUrl)).filter(Boolean)));

const getQueryKey = (subscriptionUrls: string[]) => feedsKeys.list(subscriptionUrls);

const setFeedCache = (queryClient: QueryClient, subscriptionUrls: string[], data: CacheData) => {
  queryClient.setQueryData<CacheData>(getQueryKey(subscriptionUrls), data);
};

const invalidateFeedQuery = (queryClient: QueryClient, subscriptionUrls: string[]) => {
  queryClient.invalidateQueries({ queryKey: getQueryKey(subscriptionUrls) });
};

const toSubscriptionEntries = (feeds: Feed[]) => feeds.map((feed) => toSubscription(feed));

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
      const previousSubscriptions = [...getSubscriptions()];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });

      const previousData = queryClient.getQueryData<CacheData>(previousKey);
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

      if (previousKey) {
        invalidateFeedQuery(queryClient, getSubscriptionUrls(previousSubscriptions));
      }
      if (nextKey !== previousKey) {
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
      const previousSubscriptions = [...getSubscriptions()];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);
      const nextSubscriptions = previousSubscriptions.filter((subscription) => subscription.feedUrl !== feedUrl);
      const nextUrls = getSubscriptionUrls(nextSubscriptions);
      const nextKey = getQueryKey(nextUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });
      await queryClient.cancelQueries({ queryKey: nextKey });

      const previousData = queryClient.getQueryData<CacheData>(previousKey);
      const nextData = previousData
        ? {
            feeds: previousData.feeds.filter((feed) => feed.feedUrl !== feedUrl),
            items: previousData.items.filter((item) => item.feedUrl !== feedUrl),
          }
        : { feeds: [], items: [] };

      setFeedCache(queryClient, previousUrls, nextData);
      setFeedCache(queryClient, nextUrls, nextData);
      useFeedStore.getState().removeFeedSubscription(feedUrl);

      return { previousSubscriptions, previousKey, previousData };
    },
    onSuccess: (_data, feedUrl, context) => {
      const previousSubscriptions = context?.previousSubscriptions ?? [];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const nextUrls = previousUrls.filter((url) => url !== feedUrl);

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

      if (previousSubscriptions) {
        useFeedStore.getState().setSubscriptions(previousSubscriptions);
      }
      if (previousKey) {
        queryClient.setQueryData(previousKey, previousData);
      }
    },
  });
};

// Manual refresh mutation for user-triggered refreshes
export const useRefreshFeedsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ feeds: Feed[]; items: FeedItem[] }, Error>({
    mutationFn: async () => {
      const feedUrls = getSubscriptionUrls(getSubscriptions());
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
      const feedUrls = getSubscriptionUrls(getSubscriptions());
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
        const batchResults = await Promise.allSettled(
          batch.map(async (url) => {
            const result = await workerService.fetchFeeds(url);
            return { url, result };
          })
        );

        for (let j = 0; j < batchResults.length; j++) {
          const r = batchResults[j];
          if (r.status === "fulfilled" && r.value.result.success) {
            allFeeds.push(...r.value.result.feeds);
            allItems.push(...r.value.result.items);
          } else {
            const failedUrl =
              r.status === "fulfilled" ? r.value.url : batch[j];
            failedUrls.push(failedUrl);
          }
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
      const previousSubscriptions = [...getSubscriptions()];
      const previousUrls = getSubscriptionUrls(previousSubscriptions);
      const previousKey = getQueryKey(previousUrls);

      await queryClient.cancelQueries({ queryKey: previousKey });
      const previousData = queryClient.getQueryData<CacheData>(previousKey);
      return { previousSubscriptions, previousKey, previousData };
    },
    onSuccess: (data, _url, context) => {
      const store = useFeedStore.getState();
      const previousSubscriptions = [...store.subscriptions];
      const previousKey = getQueryKey(getSubscriptionUrls(previousSubscriptions));

      store.addSubscriptions(toSubscriptionEntries(data.feeds));
      const nextSubscriptions = [...store.subscriptions];
      const nextUrls = getSubscriptionUrls(nextSubscriptions);
      const nextData = mergeCacheData(context?.previousData, {
        feeds: data.feeds,
        items: data.items,
      });

      setFeedCache(queryClient, nextUrls, nextData);
      if (previousKey) {
        invalidateFeedQuery(queryClient, getSubscriptionUrls(previousSubscriptions));
      }
      if (nextUrls.length) {
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
