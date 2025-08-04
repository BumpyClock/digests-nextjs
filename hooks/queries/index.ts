// Export all query hooks for easy importing
// Legacy use-feeds-query removed - use use-feeds instead

// Export from use-feeds (contains useFeeds and related hooks)
export { useFeeds, feedsKeys } from "./use-feeds";

// Export from use-feed (contains individual feed query)
export { useFeed } from "./use-feed";

// Export from use-feed-mutations (contains all mutation hooks)
export {
  useAddFeed,
  useBatchAddFeeds,
  useDeleteFeed,
  useRefreshFeed,
  useRefreshAllFeeds,
  useUpdateFeed,
} from "./use-feed-mutations";

// Export from other modules
export * from "./use-feed-sync";
export * from "./use-reader-view-query";

// Export commonly used hooks with legacy names for compatibility
export { useFeeds as useFeedsQuery } from "./use-feeds";
export { useRefreshAllFeeds as useRefreshFeedsMutation } from "./use-feed-mutations";
export { useAddFeed as useAddFeedMutation } from "./use-feed-mutations";
export { useDeleteFeed as useRemoveFeedMutation } from "./use-feed-mutations";
export { useBatchAddFeeds as useBatchAddFeedsMutation } from "./use-feed-mutations";

// Re-export query keys for external use
export { readerViewKeys } from "./use-reader-view-query";
