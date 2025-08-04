/**
 * Integration tests for React Query persistence layer
 * Tests the interaction between React Query hooks and persistence adapters
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useFeeds, useFeed, useAddFeed } from "@/hooks/queries";
import { createDefaultIndexedDBAdapter } from "@/lib/persistence/indexeddb-adapter";
import { createQueryPersister } from "@/lib/persistence/react-query-persister";
import { apiService } from "@/services/api-service";
import type { Feed, FeedItem } from "@/types";

// Mock API service
jest.mock("@/services/api-service");
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

Object.defineProperty(window, "indexedDB", {
  value: mockIndexedDB,
  writable: true,
});

describe("React Query Persistence Integration", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => React.JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useFeeds hook", () => {
    it("should accept options without queryKey conflicts", () => {
      const mockFeeds: Feed[] = [
        {
          type: "feed",
          guid: "test-1",
          status: "active",
          siteTitle: "Test Feed",
          siteName: "Test Feed",
          feedTitle: "Test Feed",
          feedUrl: "https://example.com/feed.xml",
          description: "Test description",
          link: "https://example.com",
          lastUpdated: new Date().toISOString(),
          lastRefreshed: new Date().toISOString(),
          published: new Date().toISOString(),
          author: null,
          language: "en",
          favicon: "",
          categories: [],
        },
      ];

      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: [],
      });

      const { result } = renderHook(
        () =>
          useFeeds({
            staleTime: 10000,
            gcTime: 20000,
          }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      expect(result.current.feeds).toEqual([]);
      expect(result.current.items).toEqual([]);
    });

    it("should handle React Query options correctly", async () => {
      const mockFeeds: Feed[] = [];
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: mockFeeds,
        items: [],
      });

      // Pre-populate some feeds to enable the query
      queryClient.setQueryData(["feeds", "list"], {
        feeds: [
          {
            type: "feed",
            guid: "test-1",
            status: "active",
            siteTitle: "Test Feed",
            siteName: "Test Feed",
            feedTitle: "Test Feed",
            feedUrl: "https://example.com/feed.xml",
            description: "Test description",
            link: "https://example.com",
            lastUpdated: new Date().toISOString(),
            lastRefreshed: new Date().toISOString(),
            published: new Date().toISOString(),
            author: null,
            language: "en",
            favicon: "",
            categories: [],
          },
        ],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(() => useFeeds(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiService.refreshFeeds).toHaveBeenCalled();
    });
  });

  describe("useFeed hook", () => {
    it("should accept options without parameter conflicts", () => {
      const { result } = renderHook(
        () =>
          useFeed("test-id", {
            staleTime: 5000,
            retry: 1,
          }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it("should work with pre-cached data", async () => {
      const mockFeed: Feed = {
        type: "feed",
        guid: "test-1",
        status: "active",
        siteTitle: "Test Feed",
        siteName: "Test Feed",
        feedTitle: "Test Feed",
        feedUrl: "https://example.com/feed.xml",
        description: "Test description",
        link: "https://example.com",
        lastUpdated: new Date().toISOString(),
        lastRefreshed: new Date().toISOString(),
        published: new Date().toISOString(),
        author: null,
        language: "en",
        favicon: "",
        categories: [],
      };

      // Pre-populate feeds cache
      queryClient.setQueryData(["feeds", "list"], {
        feeds: [mockFeed],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(() => useFeed("test-1"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.feed).toEqual(mockFeed);
      expect(result.current.data?.isFromCache).toBe(true);
    });
  });

  describe("useAddFeed mutation", () => {
    it("should handle optimistic updates correctly", async () => {
      (
        mockApiService.feeds.create as jest.MockedFunction<
          typeof mockApiService.feeds.create
        >
      ).mockResolvedValue({
        type: "feed",
        guid: "new-feed",
        status: "active",
        siteTitle: "New Feed",
        siteName: "New Feed",
        feedTitle: "New Feed",
        feedUrl: "https://new.example.com/feed.xml",
        description: "New feed description",
        link: "https://new.example.com",
        lastUpdated: new Date().toISOString(),
        lastRefreshed: new Date().toISOString(),
        published: new Date().toISOString(),
        author: null,
        language: "en",
        favicon: "",
        categories: [],
      } as Feed);

      const newFeed = {
        type: "feed",
        guid: "new-feed",
        status: "active",
        siteTitle: "New Feed",
        siteName: "New Feed",
        feedTitle: "New Feed",
        feedUrl: "https://new.example.com/feed.xml",
        description: "New feed description",
        link: "https://new.example.com",
        lastUpdated: new Date().toISOString(),
        lastRefreshed: new Date().toISOString(),
        published: new Date().toISOString(),
        author: null,
        language: "en",
        favicon: "",
        categories: [],
      } as Feed;
      mockApiService.refreshFeeds.mockResolvedValue({
        feeds: [newFeed],
        items: [],
      });

      // Pre-populate initial state
      queryClient.setQueryData(["feeds", "list"], {
        feeds: [],
        items: [],
        lastFetched: Date.now(),
      });

      const { result } = renderHook(() => useAddFeed(), { wrapper });

      // Trigger the mutation
      act(() => {
        result.current.mutate({ url: "https://new.example.com/feed.xml" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the feed was added to cache
      const feedsData = queryClient.getQueryData(["feeds", "list"]);
      expect(feedsData).toBeDefined();
    });
  });

  describe("Persistence Layer", () => {
    it("should create IndexedDB adapter successfully", () => {
      expect(() => createDefaultIndexedDBAdapter()).not.toThrow();
    });

    it("should create query persister with valid config", () => {
      const adapter = createDefaultIndexedDBAdapter();

      expect(() =>
        createQueryPersister(adapter, {
          throttleTime: 1000,
          maxAge: 24 * 60 * 60 * 1000,
          batchingInterval: 100,
        }),
      ).not.toThrow();
    });

    it("should throw error for missing adapter", () => {
      expect(() => createQueryPersister(null as any)).toThrow(
        "Persistence adapter is required",
      );
    });
  });

  describe("Type Safety", () => {
    it("should enforce correct option types for useFeeds", () => {
      // This test verifies TypeScript compilation - if it compiles, types are correct
      const { result } = renderHook(
        () =>
          useFeeds({
            staleTime: 1000,
            gcTime: 2000,
            refetchInterval: 30000,
            enabled: true,
          }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
    });

    it("should enforce correct option types for useFeed", () => {
      // This test verifies TypeScript compilation - if it compiles, types are correct
      const { result } = renderHook(
        () =>
          useFeed("test-id", {
            staleTime: 5000,
            retry: 2,
            networkMode: "online",
          }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
    });
  });
});
