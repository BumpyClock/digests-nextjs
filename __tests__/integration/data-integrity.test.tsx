// ABOUTME: Data integrity tests for feed state migration and React Query integration
// ABOUTME: Ensures data consistency, persistence, and synchronization across different states

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useFeeds,
  feedsKeys,
  type FeedsQueryData,
} from "@/hooks/queries/use-feeds";
import {
  useAddFeed,
  useDeleteFeed,
  useUpdateFeed,
} from "@/hooks/queries/use-feed-mutations";
import { useFeedStore } from "@/store/useFeedStore";
import { apiService } from "@/services/api-service";
import { FEATURES } from "@/lib/feature-flags";
import {
  mergeFeedData,
  validateFeedData,
  cleanupOldItems,
  createEmptyFeedData,
  type PersistedFeedData,
} from "@/utils/persistence-helpers";
import type { Feed, FeedItem } from "@/types";

// Mock dependencies
jest.mock("@/services/api-service");
jest.mock("@/store/useFeedStore");
jest.mock("@/lib/feature-flags");

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockUseFeedStore = useFeedStore as jest.MockedFunction<
  typeof useFeedStore
>;
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>;

// Test data
const createMockFeed = (id: string, url: string): Feed => ({
  type: "feed",
  guid: id,
  status: "active",
  siteTitle: `Blog ${id}`,
  siteName: `Blog ${id}`,
  feedTitle: `Blog ${id} RSS`,
  feedUrl: url,
  description: `Test blog ${id}`,
  link: `https://blog${id}.com`,
  lastUpdated: new Date().toISOString(),
  lastRefreshed: new Date().toISOString(),
  published: new Date().toISOString(),
  author: `Author ${id}`,
  language: "en",
  favicon: `https://blog${id}.com/favicon.ico`,
  categories: ["tech"],
});

const createMockItem = (id: string, feedUrl: string): FeedItem => ({
  type: "item",
  id,
  title: `Article ${id}`,
  description: `Test article ${id}`,
  link: `https://blog.com/article-${id}`,
  author: "Test Author",
  published: new Date().toISOString(),
  content: `Content for article ${id}`,
  created: new Date().toISOString(),
  content_encoded: `<p>Content for article ${id}</p>`,
  categories: ["tech"],
  enclosures: [],
  thumbnail: `https://blog.com/thumb-${id}.jpg`,
  thumbnailColor: "#000000",
  thumbnailColorComputed: "#000000",
  siteTitle: "Test Blog",
  siteName: "Test Blog",
  feedTitle: "Test Blog RSS",
  feedUrl,
  favicon: "https://blog.com/favicon.ico",
  favorite: false,
  pubDate: new Date().toISOString(),
});

const createMockStore = (feeds: Feed[] = [], items: FeedItem[] = []) => ({
  feeds,
  feedItems: items,
  items, // Alias for feedItems
  setFeeds: jest.fn(),
  setFeedItems: jest.fn(),
  setState: jest.fn(),
  initialized: true,
  hydrated: true,
  readItems: new Set<string>(),
  activeFeed: null,
  readLaterItems: new Set<string>(),
  setHydrated: jest.fn(),
  setActiveFeed: jest.fn(),
  setInitialized: jest.fn(),
  sortFeedItemsByDate: jest
    .fn()
    .mockImplementation((items: FeedItem[]) =>
      items.sort(
        (a, b) =>
          new Date(b.published || 0).getTime() -
          new Date(a.published || 0).getTime(),
      ),
    ),
  removeFeedFromCache: jest.fn(),
  markAsRead: jest.fn(),
  getUnreadItems: jest.fn().mockReturnValue([]),
  markAllAsRead: jest.fn(),
  addToReadLater: jest.fn(),
  removeFromReadLater: jest.fn(),
  isInReadLater: jest.fn().mockReturnValue(false),
  getReadLaterItems: jest.fn().mockReturnValue([]),
  // Audio slice properties
  currentAudio: null,
  volume: 1,
  isMuted: false,
  isMinimized: false,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playlist: [],
  playbackRate: 1,
  // Missing store properties
  isLoading: false,
  error: null,
  setIsLoading: jest.fn(),
  setError: jest.fn(),
  // Audio methods
  setVolume: jest.fn(),
  setIsMuted: jest.fn(),
  setIsMinimized: jest.fn(),
  setCurrentTrack: jest.fn(),
  setIsPlaying: jest.fn(),
  setCurrentTime: jest.fn(),
  setDuration: jest.fn(),
  setPlaylist: jest.fn(),
  setPlaybackRate: jest.fn(),
  togglePlayPause: jest.fn(),
  seek: jest.fn(),
  toggleMute: jest.fn(),
  setShowMiniPlayer: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  addToPlaylist: jest.fn(),
  removeFromPlaylist: jest.fn(),
});

const createWrapper = (initialData?: FeedsQueryData) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  if (initialData) {
    queryClient.setQueryData(feedsKeys.lists(), initialData);
  }

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Data Integrity Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockFeatures as any).USE_REACT_QUERY_FEEDS = true;
    (mockFeatures as any).ENABLE_OFFLINE_SUPPORT = true;
    (mockFeatures as any).ENABLE_BACKGROUND_SYNC = true;
  });

  describe("Cross-Store Data Consistency", () => {
    it("should maintain data consistency between Zustand and React Query", async () => {
      const feed1 = createMockFeed("feed-1", "https://blog1.com/feed.xml");
      const feed2 = createMockFeed("feed-2", "https://blog2.com/feed.xml");
      const item1 = createMockItem("item-1", feed1.feedUrl);
      const item2 = createMockItem("item-2", feed2.feedUrl);

      // Initial Zustand data
      const zustandStore = createMockStore([feed1], [item1]);
      mockUseFeedStore.mockReturnValue(zustandStore);

      // API returns updated data
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed1, feed2],
        items: [item1, item2],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify React Query data matches API response
      expect(result.current.feeds).toHaveLength(2);
      expect(result.current.items).toHaveLength(2);
      expect(result.current.feeds.map((f) => f.guid)).toContain("feed-1");
      expect(result.current.feeds.map((f) => f.guid)).toContain("feed-2");

      // Verify Zustand sync (when feature flag is disabled)
      (mockFeatures as any).USE_REACT_QUERY_FEEDS = false;

      await waitFor(() => {
        expect(zustandStore.setFeeds).toHaveBeenCalledWith([feed1, feed2]);
        expect(zustandStore.setFeedItems).toHaveBeenCalledWith([item1, item2]);
      });
    });

    it("should handle data conflicts during sync", async () => {
      const feed = createMockFeed("feed-1", "https://blog.com/feed.xml");
      const oldItem = createMockItem("item-1", feed.feedUrl);
      const updatedItem = { ...oldItem, title: "Updated Article Title" };

      // Local cache has old data
      const wrapper = createWrapper({
        feeds: [feed],
        items: [oldItem],
        lastFetched: Date.now() - 60000, // 1 minute ago
      });

      // API returns updated data
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed],
        items: [updatedItem],
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should use the newer data from API
      expect(result.current.items[0].title).toBe("Updated Article Title");
    });

    it("should preserve read status across migrations", async () => {
      const feed = createMockFeed("feed-1", "https://blog.com/feed.xml");
      const item = createMockItem("item-1", feed.feedUrl);

      const readItems = new Set(["item-1"]);
      const zustandStore = createMockStore([feed], [item]);
      zustandStore.readItems = readItems;
      zustandStore.isInReadLater = jest.fn().mockReturnValue(true);

      mockUseFeedStore.mockReturnValue(zustandStore);
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed],
        items: [item],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Read status should be preserved
      expect(zustandStore.readItems.has("item-1")).toBe(true);
    });
  });

  describe("Mutation Data Integrity", () => {
    it("should maintain data integrity during optimistic updates", async () => {
      const existingFeed = createMockFeed(
        "feed-1",
        "https://blog1.com/feed.xml",
      );
      const newFeed = createMockFeed("feed-2", "https://blog2.com/feed.xml");

      const wrapper = createWrapper({
        feeds: [existingFeed],
        items: [],
        lastFetched: Date.now(),
      });

      // Mock delayed API response
      let resolveApiCall: (value: any) => void;
      const apiPromise = new Promise((resolve) => {
        resolveApiCall = resolve;
      });
      (
        mockApiService.feeds.create as jest.MockedFunction<
          typeof mockApiService.feeds.create
        >
      ).mockReturnValue(apiPromise as Promise<Feed>);

      const { result: feedsResult } = renderHook(() => useFeeds(), { wrapper });
      const { result: addResult } = renderHook(() => useAddFeed(), { wrapper });

      // Start mutation (optimistic update)
      act(() => {
        addResult.current.mutate({ url: newFeed.feedUrl });
      });

      // Verify optimistic update
      await waitFor(() => {
        expect(feedsResult.current.feeds).toHaveLength(2);
      });

      // One should be the existing feed, one should be the optimistic placeholder
      const optimisticFeed = feedsResult.current.feeds.find((f) =>
        f.guid.startsWith("temp-"),
      );
      expect(optimisticFeed).toBeDefined();
      expect(optimisticFeed?.feedUrl).toBe(newFeed.feedUrl);

      // Resolve API call
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [],
      });

      await act(async () => {
        resolveApiCall!(newFeed);
      });

      // Verify optimistic update is replaced with real data
      await waitFor(() => {
        const feeds = feedsResult.current.feeds;
        expect(feeds).toHaveLength(2);
        expect(feeds.every((f) => !f.guid.startsWith("temp-"))).toBe(true);
        expect(feeds.map((f) => f.guid)).toContain(newFeed.guid);
      });
    });

    it("should rollback optimistic updates on error", async () => {
      const existingFeed = createMockFeed(
        "feed-1",
        "https://blog1.com/feed.xml",
      );

      const wrapper = createWrapper({
        feeds: [existingFeed],
        items: [],
        lastFetched: Date.now(),
      });

      const { result: feedsResult } = renderHook(() => useFeeds(), { wrapper });
      const { result: addResult } = renderHook(() => useAddFeed(), { wrapper });

      // Mock API error
      (
        mockApiService.feeds.create as jest.MockedFunction<
          typeof mockApiService.feeds.create
        >
      ).mockRejectedValue(new Error("API Error"));

      await act(async () => {
        try {
          await addResult.current.mutateAsync({
            url: "https://invalid.com/feed.xml",
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Verify rollback - should only have original feed
      expect(feedsResult.current.feeds).toHaveLength(1);
      expect(feedsResult.current.feeds[0].guid).toBe(existingFeed.guid);
    });

    it("should handle concurrent mutations safely", async () => {
      const existingFeed = createMockFeed(
        "feed-1",
        "https://blog1.com/feed.xml",
      );
      const feed2 = createMockFeed("feed-2", "https://blog2.com/feed.xml");
      const feed3 = createMockFeed("feed-3", "https://blog3.com/feed.xml");

      const wrapper = createWrapper({
        feeds: [existingFeed],
        items: [],
        lastFetched: Date.now(),
      });

      const { result: feedsResult } = renderHook(() => useFeeds(), { wrapper });
      const { result: addResult } = renderHook(() => useAddFeed(), { wrapper });
      const { result: deleteResult } = renderHook(() => useDeleteFeed(), {
        wrapper,
      });

      // Mock API responses
      (
        mockApiService.feeds.create as jest.MockedFunction<any>
      ).mockResolvedValue(feed2);
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed2],
        items: [],
      });
      (
        mockApiService.feeds.delete as jest.MockedFunction<any>
      ).mockResolvedValue(undefined);

      // Start concurrent mutations
      const addPromise = addResult.current.mutateAsync({ url: feed2.feedUrl });
      const deletePromise = deleteResult.current.mutateAsync(
        existingFeed.feedUrl,
      );

      await Promise.all([addPromise, deletePromise]);

      // Verify final state is consistent
      await waitFor(() => {
        const feeds = feedsResult.current.feeds;
        expect(feeds).toHaveLength(1);
        expect(feeds[0].guid).toBe(feed2.guid);
      });
    });
  });

  describe("Data Persistence and Recovery", () => {
    it("should validate persisted data structure", () => {
      const validData: PersistedFeedData = {
        feeds: [createMockFeed("feed-1", "https://blog.com/feed.xml")],
        items: [createMockItem("item-1", "https://blog.com/feed.xml")],
        lastFetched: Date.now(),
        version: 3,
        readItems: ["item-1"],
        metadata: {
          totalFeeds: 1,
          totalItems: 1,
          lastUpdated: new Date().toISOString(),
          syncStatus: "synced",
        },
      };

      expect(validateFeedData(validData)).toBe(true);

      // Test invalid data
      const invalidData = { ...validData, feeds: null };
      expect(validateFeedData(invalidData)).toBe(false);
    });

    it("should merge conflicting data correctly", () => {
      const localData: PersistedFeedData = {
        feeds: [createMockFeed("feed-1", "https://blog.com/feed.xml")],
        items: [createMockItem("item-1", "https://blog.com/feed.xml")],
        lastFetched: Date.now() - 60000, // 1 minute ago
        version: 2,
        readItems: ["item-1"],
        metadata: {
          totalFeeds: 1,
          totalItems: 1,
          lastUpdated: new Date(Date.now() - 60000).toISOString(),
          syncStatus: "synced",
        },
      };

      const remoteData: Partial<PersistedFeedData> = {
        feeds: [
          createMockFeed("feed-1", "https://blog.com/feed.xml"),
          createMockFeed("feed-2", "https://blog2.com/feed.xml"),
        ],
        items: [
          createMockItem("item-1", "https://blog.com/feed.xml"),
          createMockItem("item-2", "https://blog2.com/feed.xml"),
        ],
        lastFetched: Date.now(), // Now (newer)
        version: 3,
        readItems: ["item-2"],
      };

      const merged = mergeFeedData(localData, remoteData, "merge-by-timestamp");

      // Should use remote data (newer) but merge read items
      expect(merged.feeds).toHaveLength(2);
      expect(merged.items).toHaveLength(2);
      expect(merged.readItems).toContain("item-1"); // From local
      expect(merged.readItems).toContain("item-2"); // From remote
      expect(merged.version).toBe(4); // Incremented
    });

    it("should clean up old items correctly", () => {
      const now = Date.now();
      const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago
      const recentDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

      const data: PersistedFeedData = {
        feeds: [createMockFeed("feed-1", "https://blog.com/feed.xml")],
        items: [
          {
            ...createMockItem("old-item", "https://blog.com/feed.xml"),
            published: oldDate,
          },
          {
            ...createMockItem("recent-item", "https://blog.com/feed.xml"),
            published: recentDate,
          },
        ],
        lastFetched: now,
        version: 3,
        readItems: ["old-item", "recent-item"],
        metadata: {
          totalFeeds: 1,
          totalItems: 2,
          lastUpdated: new Date().toISOString(),
          syncStatus: "synced",
        },
      };

      const cleaned = cleanupOldItems(data, 1000, 30); // Keep items newer than 30 days

      // Should remove old item
      expect(cleaned.items).toHaveLength(1);
      expect(cleaned.items[0].id).toBe("recent-item");

      // Should clean up read items
      expect(cleaned.readItems).toHaveLength(1);
      expect(cleaned.readItems).toContain("recent-item");
      expect(cleaned.readItems).not.toContain("old-item");
    });

    it("should handle data corruption gracefully", () => {
      const corruptedData = {
        feeds: "not-an-array",
        items: undefined,
        lastFetched: "not-a-number",
        version: null,
        readItems: {},
        metadata: "not-an-object",
      };

      expect(validateFeedData(corruptedData)).toBe(false);

      // Should create empty data when corruption detected
      const emptyData = createEmptyFeedData();
      expect(validateFeedData(emptyData)).toBe(true);
      expect(emptyData.feeds).toEqual([]);
      expect(emptyData.items).toEqual([]);
      expect(emptyData.readItems).toEqual([]);
    });
  });

  describe("Cache Invalidation and Consistency", () => {
    it("should invalidate related queries correctly", async () => {
      const feed = createMockFeed("feed-1", "https://blog.com/feed.xml");
      const item = createMockItem("item-1", feed.feedUrl);

      const wrapper = createWrapper({
        feeds: [feed],
        items: [item],
        lastFetched: Date.now(),
      });

      const { result: deleteResult } = renderHook(() => useDeleteFeed(), {
        wrapper,
      });

      (
        mockApiService.feeds.delete as jest.MockedFunction<
          typeof mockApiService.feeds.delete
        >
      ).mockResolvedValue(undefined);

      await act(async () => {
        await deleteResult.current.mutateAsync(feed.feedUrl);
      });

      // Should invalidate and update cache
      expect(deleteResult.current.isSuccess).toBe(true);
    });

    it("should handle stale data correctly", async () => {
      const feed = createMockFeed("feed-1", "https://blog.com/feed.xml");
      const oldItem = createMockItem("item-1", feed.feedUrl);
      const newItem = createMockItem("item-2", feed.feedUrl);

      // Start with stale data
      const wrapper = createWrapper({
        feeds: [feed],
        items: [oldItem],
        lastFetched: Date.now() - 10 * 60 * 1000, // 10 minutes ago (stale)
      });

      // Fresh data from API
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [feed],
        items: [oldItem, newItem],
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isStale).toBe(false);
        expect(result.current.items).toHaveLength(2);
      });

      // Should have both items
      expect(result.current.items.map((i) => i.id)).toContain("item-1");
      expect(result.current.items.map((i) => i.id)).toContain("item-2");
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover from API failures", async () => {
      const feed = createMockFeed("feed-1", "https://blog.com/feed.xml");

      const wrapper = createWrapper();

      // First call fails
      mockApiService.refreshFeeds.mockRejectedValueOnce(
        new Error("Network error"),
      );

      // Second call succeeds
      mockApiService.refreshFeeds.mockResolvedValueOnce({
        feeds: [feed],
        items: [],
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      // Should initially fail
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Retry should succeed
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.feeds).toHaveLength(1);
      });
    });

    it("should handle partial failures in batch operations", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => {
          const mutation = useAddFeed();
          return {
            ...mutation,
            batchAdd: async (urls: string[]) => {
              const results = [];
              for (const url of urls) {
                try {
                  const result = await mutation.mutateAsync({ url });
                  results.push({ url, success: true, feed: result });
                } catch (error) {
                  results.push({ url, success: false, error });
                }
              }
              return results;
            },
          };
        },
        { wrapper },
      );

      // Mock some successes and some failures
      mockApiService.feeds.create;
      (mockApiService.feeds.create as jest.MockedFunction<any>)
        .mockResolvedValueOnce(
          createMockFeed("feed-1", "https://blog1.com/feed.xml"),
        )
        .mockRejectedValueOnce(new Error("Invalid feed"))
        .mockResolvedValueOnce(
          createMockFeed("feed-3", "https://blog3.com/feed.xml"),
        );

      const urls = [
        "https://blog1.com/feed.xml",
        "https://invalid.com/feed.xml",
        "https://blog3.com/feed.xml",
      ];

      const results = await result.current.batchAdd(urls);

      // Should handle partial success
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
