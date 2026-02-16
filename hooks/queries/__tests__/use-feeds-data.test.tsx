// ABOUTME: Unit tests for the useFeedsData React Query hook
// ABOUTME: Tests happy path, error handling, and loading states for feed data fetching

import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFeedsData } from "../use-feeds-data";
import { workerService } from "@/services/worker-service";
import { useFeedStore } from "@/store/useFeedStore";
import { Feed, FeedItem } from "@/types";

// Mock dependencies
jest.mock("@/services/worker-service");
jest.mock("@/store/useFeedStore");

const mockedWorkerService = workerService as jest.Mocked<typeof workerService>;
const mockedUseFeedStore = useFeedStore as jest.MockedFunction<typeof useFeedStore>;

// Mock data
const mockFeeds: Feed[] = [
  {
    type: "rss",
    guid: "guid-1",
    status: "active",
    siteTitle: "Test Site 1",
    feedTitle: "Test Feed 1",
    feedUrl: "https://example.com/feed1.xml",
    description: "Test Description 1",
    link: "https://example.com",
    lastUpdated: "2024-01-01T00:00:00Z",
    lastRefreshed: "2024-01-01T00:00:00Z",
    published: "2024-01-01T00:00:00Z",
    author: "Test Author",
    language: "en",
    favicon: "https://example.com/favicon.ico",
    categories: "tech",
  },
];

const mockFeedItems: FeedItem[] = [
  {
    type: "article",
    id: "item1",
    title: "Test Article 1",
    description: "Test Description 1",
    link: "https://example.com/articles/1",
    author: "Author 1",
    published: "2024-01-01T10:00:00Z",
    content: "<p>Content 1</p>",
    created: "2024-01-01T10:00:00Z",
    content_encoded: "<p>Content 1</p>",
    categories: "tech",
    enclosures: [],
    thumbnail: "",
    thumbnailColor: { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: "#000000",
    siteTitle: "Test Site 1",
    feedTitle: "Test Feed 1",
    feedUrl: "https://example.com/feed1.xml",
    favicon: "https://example.com/favicon.ico",
  },
  {
    type: "article",
    id: "item2",
    title: "Test Article 2",
    description: "Test Description 2",
    link: "https://example.com/articles/2",
    author: "Author 2",
    published: "2024-01-01T09:00:00Z",
    content: "<p>Content 2</p>",
    created: "2024-01-01T09:00:00Z",
    content_encoded: "<p>Content 2</p>",
    categories: "tech",
    enclosures: [],
    thumbnail: "",
    thumbnailColor: { r: 0, g: 0, b: 0 },
    thumbnailColorComputed: "#000000",
    siteTitle: "Test Site 1",
    feedTitle: "Test Feed 1",
    feedUrl: "https://example.com/feed1.xml",
    favicon: "https://example.com/favicon.ico",
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function QueryClientTestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  QueryClientTestWrapper.displayName = "QueryClientTestWrapper";

  return QueryClientTestWrapper;
};

describe("useFeedsData", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for store
    mockedUseFeedStore.mockReturnValue({
      subscriptions: [{ feedUrl: "https://example.com/feed1.xml" }],
    } as unknown as ReturnType<typeof useFeedStore>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should return empty data when no feed URLs are provided", async () => {
    mockedUseFeedStore.mockReturnValue({
      subscriptions: [],
    } as unknown as ReturnType<typeof useFeedStore>);

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      feeds: [],
      items: [],
    });
  });

  it("should fetch and return feeds data successfully", async () => {
    mockedWorkerService.refreshFeeds.mockResolvedValue({
      success: true,
      feeds: mockFeeds,
      items: mockFeedItems,
      message: "Success",
    });

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      feeds: mockFeeds,
      items: mockFeedItems, // Items should be sorted by date desc
    });

    expect(mockedWorkerService.refreshFeeds).toHaveBeenCalledWith([
      "https://example.com/feed1.xml",
    ]);
  });

  it("should sort items by date descending", async () => {
    const unsortedItems = [...mockFeedItems]; // Already in desc order
    const reversedItems = [...mockFeedItems].reverse(); // Put in asc order

    mockedWorkerService.refreshFeeds.mockResolvedValue({
      success: true,
      feeds: mockFeeds,
      items: reversedItems, // Feed in asc order
      message: "Success",
    });

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should be sorted back to desc order (newest first)
    expect(result.current.data?.items).toEqual(unsortedItems);
  });

  it("should handle worker service errors", async () => {
    mockedWorkerService.refreshFeeds.mockResolvedValue({
      success: false,
      feeds: [],
      items: [],
      message: "Failed to refresh feeds",
    });

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error("Failed to refresh feeds"));
  });

  it("should handle worker service rejections", async () => {
    mockedWorkerService.refreshFeeds.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error("Network error"));
  });

  it("should use proper query key based on feed URLs", async () => {
    mockedUseFeedStore.mockReturnValue({
      subscriptions: [
      "https://example.com/feed1.xml",
      "https://example.com/feed2.xml",
    ].map((feedUrl) => ({ feedUrl })),
    } as unknown as ReturnType<typeof useFeedStore>);

    mockedWorkerService.refreshFeeds.mockResolvedValue({
      success: true,
      feeds: mockFeeds,
      items: mockFeedItems,
      message: "Success",
    });

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedWorkerService.refreshFeeds).toHaveBeenCalledWith([
      "https://example.com/feed1.xml",
      "https://example.com/feed2.xml",
    ]);
  });

  it("should not fetch when query is disabled (no feeds)", () => {
    mockedUseFeedStore.mockReturnValue({
      subscriptions: [],
    } as unknown as ReturnType<typeof useFeedStore>);

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    // Should not be loading since query is disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockedWorkerService.refreshFeeds).not.toHaveBeenCalled();
  });

  it("should have correct cache configuration", async () => {
    mockedWorkerService.refreshFeeds.mockResolvedValue({
      success: true,
      feeds: mockFeeds,
      items: mockFeedItems,
      message: "Success",
    });

    const { result } = renderHook(() => useFeedsData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The hook should be configured with proper cache timing
    // We can't directly test the timing config, but we can ensure
    // the query is properly structured
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
    expect(result.current.isStale).toBe(false);
  });
});
