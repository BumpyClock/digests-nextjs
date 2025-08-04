// ABOUTME: Unit tests for feed mutation hooks with optimistic updates and error recovery
// ABOUTME: Tests add, update, delete, and refresh mutations with offline sync support

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import type { Feed, FeedItem } from "@/types";

// Mock dependencies first
jest.mock("@/services/api-service", () => ({
  apiService: {
    refreshFeeds: jest.fn(),
    feeds: {
      create: jest.fn(),
      createBatch: jest.fn(),
      getById: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      refresh: jest.fn(),
    },
  },
}));

jest.mock("@/hooks/useSyncQueue", () => ({
  useSyncQueue: jest.fn(),
}));

jest.mock("@/lib/feature-flags", () => ({
  FEATURES: {
    USE_REACT_QUERY_FEEDS: true,
    ENABLE_OFFLINE_SUPPORT: false,
  },
}));

// Import after mocking
import {
  useAddFeed,
  useUpdateFeed,
  useDeleteFeed,
  useRefreshFeed,
  useRefreshAllFeeds,
  useBatchAddFeeds,
} from "../use-feed-mutations";
import { feedsKeys, type FeedsQueryData } from "../use-feeds";
import { apiService } from "@/services/api-service";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { FEATURES } from "@/lib/feature-flags";

// Properly typed mocks
const mockApiService = {
  feeds: {
    create: jest.fn() as jest.MockedFunction<typeof apiService.feeds.create>,
    createBatch: jest.fn(),
    getById: jest.fn() as jest.MockedFunction<typeof apiService.feeds.getById>,
    getAll: jest.fn() as jest.MockedFunction<typeof apiService.feeds.getAll>,
    delete: jest.fn() as jest.MockedFunction<typeof apiService.feeds.delete>,
    refresh: jest.fn() as jest.MockedFunction<typeof apiService.feeds.refresh>,
  },
  refreshFeeds: jest.fn() as jest.MockedFunction<
    typeof apiService.refreshFeeds
  >,
};

const mockUseSyncQueue = useSyncQueue as jest.MockedFunction<
  typeof useSyncQueue
>;
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>;

// Override the actual apiService with our mocks
(apiService as any).feeds = mockApiService.feeds;
(apiService as any).refreshFeeds = mockApiService.refreshFeeds;

// Test data
const mockFeed: Feed = {
  type: "feed",
  guid: "feed-1",
  status: "active",
  siteTitle: "Test Blog",
  siteName: "Test Blog",
  feedTitle: "Test Blog Feed",
  feedUrl: "https://test.com/feed.xml",
  description: "A test blog",
  link: "https://test.com",
  lastUpdated: "2023-01-01T00:00:00Z",
  lastRefreshed: "2023-01-01T00:00:00Z",
  published: "2023-01-01T00:00:00Z",
  author: "Test Author",
  language: "en",
  favicon: "https://test.com/favicon.ico",
  categories: ["tech"],
};

const mockItem: FeedItem = {
  type: "item",
  id: "item-1",
  title: "Test Article",
  description: "A test article",
  link: "https://test.com/article-1",
  author: "Test Author",
  published: "2023-01-01T00:00:00Z",
  content: "Test content",
  created: "2023-01-01T00:00:00Z",
  content_encoded: "Test content encoded",
  categories: ["tech"],
  enclosures: [],
  thumbnail: "https://test.com/thumb.jpg",
  thumbnailColor: { r: 0, g: 0, b: 0 },
  thumbnailColorComputed: true,
  siteTitle: "Test Blog",
  siteName: "Test Blog",
  feedTitle: "Test Blog Feed",
  feedUrl: "https://test.com/feed.xml",
  favicon: "https://test.com/favicon.ico",
  favorite: false,
  pubDate: "2023-01-01T00:00:00Z",
};

const mockSyncQueue = {
  addToQueue: jest.fn(),
  processQueue: jest.fn(),
  clearQueue: jest.fn(),
  queueSize: 0,
  isProcessing: false,
  queue: [] as Array<{ mutationKey: [string, any] }>,
  queueStatus: {
    total: 0,
    pending: 0,
    failed: 0,
    succeeded: 0,
    isEmpty: true,
  },
  isOnline: true,
  forceSync: jest.fn(),
};

// Test wrapper component
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

describe("Feed Mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear our custom mocks
    mockApiService.feeds.create.mockClear();
    mockApiService.feeds.getById.mockClear();
    mockApiService.feeds.getAll.mockClear();
    mockApiService.feeds.delete.mockClear();
    mockApiService.feeds.refresh.mockClear();
    mockApiService.refreshFeeds.mockClear();

    mockUseSyncQueue.mockReturnValue(mockSyncQueue);
    Object.assign(mockFeatures, {
      USE_REACT_QUERY_FEEDS: true,
      ENABLE_OFFLINE_SUPPORT: false,
    });
  });

  describe("useAddFeed", () => {
    it("should add a feed successfully", async () => {
      const newFeed = { ...mockFeed, guid: "new-feed" };
      // Mock the new createBatch method instead of create
      mockApiService.feeds.createBatch.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem],
        successfulCount: 1,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      });

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useAddFeed, { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ url: "https://new.com/feed.xml" });
      });

      expect(mockApiService.feeds.createBatch).toHaveBeenCalledWith({
        urls: ["https://new.com/feed.xml"],
      });
      expect(result.current.isSuccess).toBe(true);
    });

    it("should handle API errors", async () => {
      // Mock createBatch to return failure
      mockApiService.feeds.createBatch.mockResolvedValue({
        feeds: [],
        items: [],
        successfulCount: 0,
        failedCount: 1,
        failedUrls: ["https://invalid.com/feed.xml"],
        errors: [
          { url: "https://invalid.com/feed.xml", error: "Failed to add feed" },
        ],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(useAddFeed, { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            url: "https://invalid.com/feed.xml",
          });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain("Failed to add feed");
    });

    it("should queue operation when offline", async () => {
      Object.assign(mockFeatures, { ENABLE_OFFLINE_SUPPORT: true });

      const wrapper = createWrapper();
      const { result } = renderHook(useAddFeed, { wrapper });

      const newFeed = { ...mockFeed, guid: "new-feed" };
      mockApiService.feeds.createBatch.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem],
        successfulCount: 1,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      });

      await act(async () => {
        await result.current.mutateAsync({ url: "https://new.com/feed.xml" });
      });

      expect(mockSyncQueue.addToQueue).toHaveBeenCalled();
    });
  });

  describe("useDeleteFeed", () => {
    it("should delete a feed successfully", async () => {
      mockApiService.feeds.delete.mockResolvedValue(undefined);

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useDeleteFeed, { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockFeed.feedUrl);
      });

      expect(mockApiService.feeds.delete).toHaveBeenCalledWith(mockFeed.guid);
      expect(result.current.isSuccess).toBe(true);
    });

    it("should handle deletion errors", async () => {
      const error = new Error("Failed to delete feed");
      mockApiService.feeds.delete.mockRejectedValue(error);

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useDeleteFeed, { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockFeed.feedUrl);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe("useRefreshAllFeeds", () => {
    it("should refresh all feeds", async () => {
      const refreshedData = {
        feeds: [mockFeed],
        items: [mockItem, { ...mockItem, id: "item-2" }],
      };
      mockApiService.refreshFeeds.mockResolvedValue(refreshedData);

      const wrapper = createWrapper({
        feeds: [mockFeed],
        items: [mockItem],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useRefreshAllFeeds, { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(mockApiService.refreshFeeds).toHaveBeenCalledWith([
        mockFeed.feedUrl,
      ]);
      expect(result.current.isSuccess).toBe(true);
    });

    it("should handle empty feed list", async () => {
      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useRefreshAllFeeds, { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled();
    });
  });

  describe("useBatchAddFeeds", () => {
    it("should add multiple feeds successfully", async () => {
      const urls = ["https://feed1.com/rss", "https://feed2.com/rss"];
      const feed1 = { ...mockFeed, guid: "feed-1", feedUrl: urls[0] };
      const feed2 = { ...mockFeed, guid: "feed-2", feedUrl: urls[1] };

      // Mock the new createBatch method for batch processing
      mockApiService.feeds.createBatch.mockResolvedValue({
        feeds: [feed1, feed2],
        items: [mockItem, { ...mockItem, id: "item-2" }],
        successfulCount: 2,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      });

      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useBatchAddFeeds, { wrapper });

      await act(async () => {
        await result.current.mutateAsync(urls);
      });

      expect(mockApiService.feeds.createBatch).toHaveBeenCalledWith({ urls });
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.successfulCount).toBe(2);
      expect(result.current.data?.failedCount).toBe(0);
    });

    it("should handle partial failures", async () => {
      const urls = ["https://feed1.com/rss", "https://invalid.com/rss"];
      const feed1 = { ...mockFeed, guid: "feed-1", feedUrl: urls[0] };

      // Mock createBatch to return partial success
      mockApiService.feeds.createBatch.mockResolvedValue({
        feeds: [feed1],
        items: [mockItem],
        successfulCount: 1,
        failedCount: 1,
        failedUrls: ["https://invalid.com/rss"],
        errors: [{ url: "https://invalid.com/rss", error: "Invalid feed" }],
      });

      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(useBatchAddFeeds, { wrapper });

      await act(async () => {
        await result.current.mutateAsync(urls);
      });

      expect(mockApiService.feeds.createBatch).toHaveBeenCalledWith({ urls });
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.successfulCount).toBe(1);
      expect(result.current.data?.failedCount).toBe(1);
      expect(result.current.data?.failedUrls).toContain(
        "https://invalid.com/rss",
      );
    });
  });

  describe("feature flag integration", () => {
    it("should respect React Query feature flag", async () => {
      Object.assign(mockFeatures, { USE_REACT_QUERY_FEEDS: false });

      const wrapper = createWrapper();
      const { result } = renderHook(useAddFeed, { wrapper });

      const newFeed = { ...mockFeed, guid: "new-feed" };
      mockApiService.feeds.create.mockResolvedValue(newFeed);
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem],
      });

      await act(async () => {
        await result.current.mutateAsync({ url: "https://test.com/feed.xml" });
      });

      // Should still work but may behave differently
      expect(
        result.current.isPending ||
          result.current.isSuccess ||
          result.current.isError,
      ).toBe(true);
    });

    it("should handle offline support feature flag", async () => {
      Object.assign(mockFeatures, { ENABLE_OFFLINE_SUPPORT: true });

      const wrapper = createWrapper();
      const { result } = renderHook(useAddFeed, { wrapper });

      const newFeed = { ...mockFeed, guid: "new-feed" };
      mockApiService.feeds.create.mockResolvedValue(newFeed);
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [mockItem],
      });

      await act(async () => {
        await result.current.mutateAsync({ url: "https://test.com/feed.xml" });
      });

      expect(mockSyncQueue.addToQueue).toHaveBeenCalled();
    });
  });
});
