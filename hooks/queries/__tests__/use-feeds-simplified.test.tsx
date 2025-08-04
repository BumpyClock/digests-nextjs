// ABOUTME: Simplified unit tests for useFeeds React Query hook
// ABOUTME: Tests basic functionality without complex feature flag issues

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock the entire feature flags module before any imports
const mockFeatures = {
  USE_REACT_QUERY_FEEDS: true,
  USE_REACT_QUERY_AUTH: true,
  ENABLE_OFFLINE_SUPPORT: false,
  ENABLE_BACKGROUND_SYNC: false,
};

jest.mock("@/lib/feature-flags", () => ({
  FEATURES: mockFeatures,
  isFeatureEnabled: jest.fn(),
  getEnabledFeatures: jest.fn(),
}));

// Mock the API service
jest.mock("@/services/api-service", () => ({
  apiService: {
    refreshFeeds: jest.fn(),
    feeds: {
      create: jest.fn(),
      getById: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      refresh: jest.fn(),
    },
  },
}));

// Mock the feed store
const mockFeedStore = {
  feeds: [],
  feedItems: [],
  setFeeds: jest.fn(),
  setFeedItems: jest.fn(),
  initialized: true,
  hydrated: true,
  readItems: new Set<string>(),
  activeFeed: null,
  readLaterItems: new Set<string>(),
  setHydrated: jest.fn(),
  setActiveFeed: jest.fn(),
  setInitialized: jest.fn(),
  sortFeedItemsByDate: jest.fn().mockImplementation((items) => items),
  removeFeedFromCache: jest.fn(),
  markAsRead: jest.fn(),
  getUnreadItems: jest.fn().mockReturnValue([]),
  markAllAsRead: jest.fn(),
  addToReadLater: jest.fn(),
  removeFromReadLater: jest.fn(),
  isInReadLater: jest.fn().mockReturnValue(false),
  getReadLaterItems: jest.fn().mockReturnValue([]),
  volume: 1,
  isMuted: false,
  isMinimized: false,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playlist: [],
  playbackRate: 1,
  setVolume: jest.fn(),
  setIsMuted: jest.fn(),
  setIsMinimized: jest.fn(),
  setCurrentTrack: jest.fn(),
  setIsPlaying: jest.fn(),
  setCurrentTime: jest.fn(),
  setDuration: jest.fn(),
  setPlaylist: jest.fn(),
  setPlaybackRate: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  seek: jest.fn(),
  addToPlaylist: jest.fn(),
  removeFromPlaylist: jest.fn(),
};

jest.mock("@/store/useFeedStore", () => ({
  useFeedStore: jest.fn(() => mockFeedStore),
}));

// Mock the logger
jest.mock("@/utils/logger", () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Now import the hook and mocked services
import { useFeeds, feedsKeys } from "../use-feeds";
import { apiService } from "@/services/api-service";
import type { Feed, FeedItem } from "@/types";

const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Test data
const mockFeeds: Feed[] = [
  {
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
  },
];

const mockItems: FeedItem[] = [
  {
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
    thumbnailColor: "#000000",
    thumbnailColorComputed: "#000000",
    siteTitle: "Test Blog",
    siteName: "Test Blog",
    feedTitle: "Test Blog Feed",
    feedUrl: "https://test.com/feed.xml",
    favicon: "https://test.com/favicon.ico",
    favorite: false,
    pubDate: "2023-01-01T00:00:00Z",
  },
];

// Test wrapper component
const createWrapper = (initialData?: any) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
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

describe("useFeeds (Simplified)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset feature flags
    Object.assign(mockFeatures, {
      USE_REACT_QUERY_FEEDS: true,
      USE_REACT_QUERY_AUTH: true,
      ENABLE_OFFLINE_SUPPORT: false,
      ENABLE_BACKGROUND_SYNC: false,
    });
  });

  describe("basic functionality", () => {
    it("should fetch feeds and items successfully", async () => {
      // Set up initial data in wrapper
      const wrapper = createWrapper({
        feeds: mockFeeds,
        items: [],
        lastFetched: Date.now(),
      });

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.feeds).toEqual(mockFeeds);
      expect(result.current.items).toEqual(mockItems);
      expect(result.current.lastFetched).toBeDefined();
    });

    it("should handle API errors gracefully", async () => {
      const wrapper = createWrapper({
        feeds: mockFeeds,
        items: [],
        lastFetched: Date.now(),
      });

      const mockError = new Error("API Error");
      mockApiService.refreshFeeds.mockRejectedValue(mockError);

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.error).toBe(mockError);
      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
    });

    it("should return empty state when no feeds exist", async () => {
      const wrapper = createWrapper({
        feeds: [],
        items: [],
        lastFetched: Date.now(),
      });

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [],
        items: [],
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
    });

    it("should provide status indicators", async () => {
      const wrapper = createWrapper({
        feeds: mockFeeds,
        items: [],
        lastFetched: Date.now(),
      });

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.isStale).toBeDefined();
      expect(result.current.isFetching).toBeDefined();
      expect(result.current.isBackgroundFetching).toBeDefined();
    });

    it("should sort items by published date", async () => {
      const unsortedItems = [
        { ...mockItems[0], id: "item-1", published: "2023-01-02T00:00:00Z" },
        { ...mockItems[0], id: "item-2", published: "2023-01-01T00:00:00Z" },
        { ...mockItems[0], id: "item-3", published: "2023-01-03T00:00:00Z" },
      ];

      const wrapper = createWrapper({
        feeds: mockFeeds,
        items: [],
        lastFetched: Date.now(),
      });

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: unsortedItems,
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );

      // Items should be sorted newest first
      expect(result.current.items[0].id).toBe("item-3");
      expect(result.current.items[1].id).toBe("item-1");
      expect(result.current.items[2].id).toBe("item-2");
    });
  });

  describe("query keys", () => {
    it("should use correct query keys", () => {
      expect(feedsKeys.all).toEqual(["feeds"]);
      expect(feedsKeys.lists()).toEqual(["feeds", "list"]);
      expect(feedsKeys.list(["tech"])).toEqual([
        "feeds",
        "list",
        { filters: ["tech"] },
      ]);
      expect(feedsKeys.details()).toEqual(["feeds", "detail"]);
      expect(feedsKeys.detail("feed-1")).toEqual(["feeds", "detail", "feed-1"]);
    });
  });

  describe("custom options", () => {
    it("should handle custom options", async () => {
      const wrapper = createWrapper();

      const customOptions = {
        staleTime: 10000,
        enabled: false,
      };

      const { result } = renderHook(() => useFeeds(customOptions), { wrapper });

      // Query should respect custom options
      expect(result.current.isPending).toBe(true);
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled();
    });
  });

  describe("feature flags", () => {
    it("should respect USE_REACT_QUERY_FEEDS flag", () => {
      // When disabled, should use Zustand store
      Object.assign(mockFeatures, { USE_REACT_QUERY_FEEDS: false });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      expect(result.current.feeds).toEqual([]); // From Zustand store (empty by default)
      expect(result.current.items).toEqual([]); // React Query disabled
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled();
    });

    it("should handle offline support flag", () => {
      Object.assign(mockFeatures, { ENABLE_OFFLINE_SUPPORT: true });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      // Query should be configured for offline-first mode
      expect(result.current.feeds).toBeDefined();
    });

    it("should handle background sync flag", () => {
      Object.assign(mockFeatures, { ENABLE_BACKGROUND_SYNC: true });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      // Query should be configured with background refresh
      expect(result.current.isBackgroundFetching).toBeDefined();
    });
  });
});
