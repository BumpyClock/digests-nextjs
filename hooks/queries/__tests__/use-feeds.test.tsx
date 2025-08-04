// ABOUTME: Unit tests for useFeeds React Query hook with offline and persistence features
// ABOUTME: Tests caching, error handling, background sync, and feature flag integration

// Mock feature flags BEFORE any imports that use them
jest.mock("@/lib/feature-flags", () => ({
  FEATURES: {
    USE_REACT_QUERY_FEEDS: true,
    USE_REACT_QUERY_AUTH: true,
    ENABLE_OFFLINE_SUPPORT: false,
    ENABLE_BACKGROUND_SYNC: false,
  },
  isFeatureEnabled: jest.fn((flag) => {
    const flags = {
      USE_REACT_QUERY_FEEDS: true,
      USE_REACT_QUERY_AUTH: true,
      ENABLE_OFFLINE_SUPPORT: false,
      ENABLE_BACKGROUND_SYNC: false,
    };
    return flags[flag as keyof typeof flags] ?? false;
  }),
  getEnabledFeatures: jest.fn(() => [
    "USE_REACT_QUERY_FEEDS",
    "USE_REACT_QUERY_AUTH",
  ]),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useFeeds, feedsKeys } from "../use-feeds";
import { apiService } from "@/services/api-service";
import { useFeedStore } from "@/store/useFeedStore";
import { FEATURES } from "@/lib/feature-flags";
import type { Feed, FeedItem } from "@/types";

// Mock dependencies - Need to use proper ES module mocks
jest.mock("@/services/api-service", () => {
  return {
    apiService: {
      refreshFeeds: jest.fn(),
      feeds: {
        create: jest.fn(),
        getById: jest.fn(),
        getAll: jest.fn(),
        delete: jest.fn(),
        refresh: jest.fn(),
      },
      fetchReaderView: jest.fn(),
    },
  };
});

jest.mock("@/store/useFeedStore");

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockUseFeedStore = useFeedStore as jest.MockedFunction<
  typeof useFeedStore
>;
const mockFeatures = FEATURES as jest.Mocked<typeof FEATURES>;

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

const mockFeedStore = {
  // Core feed data
  feeds: mockFeeds,
  feedItems: mockItems,
  items: mockItems, // Alias for feedItems
  setFeeds: jest.fn(),
  setFeedItems: jest.fn(),
  removeFeedFromCache: jest.fn(),

  // Store state management
  setState: jest.fn(),
  initialized: true,
  hydrated: true,
  isLoading: false,
  error: null,
  setHydrated: jest.fn(),
  setInitialized: jest.fn(),
  setIsLoading: jest.fn(),
  setError: jest.fn(),

  // Feed management
  activeFeed: null,
  setActiveFeed: jest.fn(),
  sortFeedItemsByDate: jest
    .fn()
    .mockImplementation((items: FeedItem[]) => items),

  // Read status management
  readItems: new Set<string>(),
  readLaterItems: new Set<string>(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  getUnreadItems: jest.fn().mockReturnValue([]),
  addToReadLater: jest.fn(),
  removeFromReadLater: jest.fn(),
  isInReadLater: jest.fn().mockReturnValue(false),
  getReadLaterItems: jest.fn().mockReturnValue([]),

  // Audio player state
  currentAudio: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isMinimized: false,
  currentTrack: null,
  playlist: [],
  playbackRate: 1,

  // Audio player actions
  togglePlayPause: jest.fn(),
  seek: jest.fn(),
  setVolume: jest.fn(),
  toggleMute: jest.fn(),
  setShowMiniPlayer: jest.fn(),
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
  addToPlaylist: jest.fn(),
  removeFromPlaylist: jest.fn(),
};

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

  // Set initial data if provided
  if (initialData) {
    queryClient.setQueryData(feedsKeys.lists(), initialData);
  }

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFeeds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeedStore.mockReturnValue(mockFeedStore);

    // Reset feature flags to defaults
    Object.assign(mockFeatures, {
      USE_REACT_QUERY_FEEDS: true,
      ENABLE_BACKGROUND_SYNC: false,
      ENABLE_OFFLINE_SUPPORT: false,
    });
  });

  describe("with React Query enabled", () => {
    it("should fetch feeds and items successfully", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.feeds).toEqual(mockFeeds);
      expect(result.current.items).toEqual(mockItems);
      expect(result.current.lastFetched).toBeDefined();
      expect(mockApiService.refreshFeeds).toHaveBeenCalledWith([]);
    });

    it("should handle API errors gracefully", async () => {
      const mockError = new Error("API Error");
      mockApiService.refreshFeeds.mockRejectedValue(mockError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
    });

    it("should respect feature flags", async () => {
      const mockFeaturesDisabled = {
        ...mockFeatures,
        USE_REACT_QUERY_FEEDS: false,
      };
      jest.doMock("@/lib/feature-flags", () => ({
        FEATURES: mockFeaturesDisabled,
        isFeatureEnabled: jest.fn(() => false),
        getEnabledFeatures: jest.fn(() => []),
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      expect(result.current.feeds).toEqual(mockFeeds); // From Zustand store
      expect(result.current.items).toEqual([]); // React Query disabled
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled();
    });

    it("should sync with Zustand when feature disabled", async () => {
      const mockFeaturesDisabled = {
        ...mockFeatures,
        USE_REACT_QUERY_FEEDS: false,
      };
      jest.doMock("@/lib/feature-flags", () => ({
        FEATURES: mockFeaturesDisabled,
        isFeatureEnabled: jest.fn(() => false),
        getEnabledFeatures: jest.fn(() => []),
      }));
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const wrapper = createWrapper();
      renderHook(() => useFeeds(), { wrapper });

      // When React Query is disabled, no automatic sync occurs
      expect(mockFeedStore.setFeeds).not.toHaveBeenCalled();
      expect(mockFeedStore.setFeedItems).not.toHaveBeenCalled();
    });

    it("should enable background sync when feature enabled", () => {
      const mockFeaturesWithSync = {
        ...mockFeatures,
        ENABLE_BACKGROUND_SYNC: true,
      };
      jest.doMock("@/lib/feature-flags", () => ({
        FEATURES: mockFeaturesWithSync,
        isFeatureEnabled: jest.fn(
          (flag) =>
            flag === "ENABLE_BACKGROUND_SYNC" ||
            flag === "USE_REACT_QUERY_FEEDS",
        ),
        getEnabledFeatures: jest.fn(() => [
          "USE_REACT_QUERY_FEEDS",
          "ENABLE_BACKGROUND_SYNC",
        ]),
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      // Query should be configured with background refresh
      expect(result.current.isBackgroundFetching).toBeDefined();
    });

    it("should provide enhanced status indicators", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isStale).toBeDefined();
      expect(result.current.isFetching).toBeDefined();
      expect(result.current.isBackgroundFetching).toBeDefined();
    });

    it("should handle empty feed list", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [],
        items: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
    });

    it("should sort items by published date", async () => {
      const unsortedItems = [
        { ...mockItems[0], published: "2023-01-02T00:00:00Z" },
        { ...mockItems[0], id: "item-2", published: "2023-01-01T00:00:00Z" },
        { ...mockItems[0], id: "item-3", published: "2023-01-03T00:00:00Z" },
      ];

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: unsortedItems,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Items should be sorted newest first
      expect(result.current.items[0].id).toBe("item-3");
      expect(result.current.items[1].id).toBe("item-1");
      expect(result.current.items[2].id).toBe("item-2");
    });

    it("should handle network offline mode", () => {
      const mockFeaturesWithOffline = {
        ...mockFeatures,
        ENABLE_OFFLINE_SUPPORT: true,
      };
      jest.doMock("@/lib/feature-flags", () => ({
        FEATURES: mockFeaturesWithOffline,
        isFeatureEnabled: jest.fn(
          (flag) =>
            flag === "ENABLE_OFFLINE_SUPPORT" ||
            flag === "USE_REACT_QUERY_FEEDS",
        ),
        getEnabledFeatures: jest.fn(() => [
          "USE_REACT_QUERY_FEEDS",
          "ENABLE_OFFLINE_SUPPORT",
        ]),
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      // Query should be configured for offline-first mode
      expect(result.current.feeds).toBeDefined();
    });

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

    it("should handle custom options", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const customOptions = {
        staleTime: 10000,
        enabled: false,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(customOptions), { wrapper });

      // Query should respect custom options
      expect(result.current.isPending).toBe(true);
      expect(mockApiService.refreshFeeds).not.toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle network timeouts", async () => {
      const timeoutError = new Error("Network timeout");
      timeoutError.name = "TimeoutError";
      mockApiService.refreshFeeds.mockRejectedValue(timeoutError);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(timeoutError);
    });

    it("should handle malformed API responses", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: null as any,
        items: undefined as any,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("caching behavior", () => {
    it("should cache successful responses", async () => {
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: mockItems,
      });

      const wrapper = createWrapper();

      // First render
      const { result: result1, unmount: unmount1 } = renderHook(
        () => useFeeds(),
        { wrapper },
      );
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));
      unmount1();

      // Second render should use cached data
      const { result: result2 } = renderHook(() => useFeeds(), { wrapper });
      expect(result2.current.feeds).toEqual(mockFeeds);
      expect(result2.current.items).toEqual(mockItems);

      // API should only be called once
      expect(mockApiService.refreshFeeds).toHaveBeenCalledTimes(1);
    });
  });
});
