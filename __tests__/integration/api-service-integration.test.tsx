/**
 * Integration tests for the new API service layer
 * Tests the complete flow of API operations with real component interactions
 */

import React from "react";
import { render, screen, waitFor } from "@/test-utils/render";
import { createUser } from "@/test-utils/helpers";
import { apiService } from "@/services/api-service";
import type { Feed, FeedItem, ReaderViewResponse } from "@/types";
import { toast } from "sonner";

// Mock toast notifications
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  },
}));

// Mock the API config store
jest.mock("@/store/useApiConfigStore", () => ({
  getApiConfig: jest.fn(() => ({
    baseUrl: "http://test-api.example.com",
  })),
}));

// Component that uses the API service
const FeedManager: React.FC = () => {
  const [feeds, setFeeds] = React.useState<Feed[]>([]);
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [readerView, setReaderView] = React.useState<ReaderViewResponse | null>(
    null,
  );

  const loadFeeds = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.fetchFeeds([
        "http://example.com/feed1.xml",
        "http://example.com/feed2.xml",
      ]);
      setFeeds(result.feeds);
      setItems(result.items);
      toast.success("Feeds loaded successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load feeds";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeeds = async () => {
    setLoading(true);
    try {
      const result = await apiService.refreshFeeds([
        "http://example.com/feed1.xml",
        "http://example.com/feed2.xml",
      ]);
      setFeeds(result.feeds);
      setItems(result.items);
      toast.success("Feeds refreshed successfully");
    } catch (err) {
      toast.error("Failed to refresh feeds");
    } finally {
      setLoading(false);
    }
  };

  const addFeed = async (url: string) => {
    try {
      const feed = await apiService.feeds.create({ url });
      setFeeds((prev) => [...prev, feed]);
      toast.success("Feed added successfully");
    } catch (err) {
      toast.error("Failed to add feed");
    }
  };

  const loadReaderView = async (url: string) => {
    try {
      const view = await apiService.fetchReaderView(url);
      setReaderView(view);
    } catch (err) {
      toast.error("Failed to load reader view");
    }
  };

  React.useEffect(() => {
    loadFeeds();
  }, []);

  if (loading) {
    return <div role="status">Loading feeds...</div>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>Error: {error}</p>
        <button onClick={loadFeeds}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Feed Manager</h1>
      <button onClick={refreshFeeds}>Refresh All</button>
      <button onClick={() => addFeed("http://example.com/new-feed.xml")}>
        Add Feed
      </button>

      <div data-testid="feeds-list">
        {feeds.map((feed) => (
          <div key={feed.guid} data-testid={`feed-${feed.guid}`}>
            <h3>{feed.feedTitle}</h3>
            <p>{feed.description}</p>
          </div>
        ))}
      </div>

      <div data-testid="items-list">
        {items.map((item) => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            <h4>{item.title}</h4>
            <button onClick={() => loadReaderView(item.link)}>
              View Reader Mode
            </button>
          </div>
        ))}
      </div>

      {readerView && (
        <div data-testid="reader-view">
          <h2>{readerView.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: readerView.content }} />
        </div>
      )}
    </div>
  );
};

describe("API Service Integration", () => {
  let mockFetch: jest.Mock;

  // Define mock data at the top level so all tests can access it
  const mockFeeds: Feed[] = [
    {
      type: "rss",
      guid: "feed-1",
      status: "active",
      siteTitle: "Tech Blog",
      siteName: "Tech Blog",
      feedTitle: "Tech Blog RSS",
      feedUrl: "http://example.com/feed1.xml",
      description: "Latest tech news",
      link: "http://example.com",
      lastUpdated: "2023-01-01T00:00:00Z",
      lastRefreshed: "2023-01-01T00:00:00Z",
      published: "2023-01-01T00:00:00Z",
      author: "Tech Team",
      language: "en",
      favicon: "http://example.com/favicon.ico",
      categories: ["technology"],
      items: [],
    },
    {
      type: "rss",
      guid: "feed-2",
      status: "active",
      siteTitle: "Science Daily",
      siteName: "Science Daily",
      feedTitle: "Science Daily Feed",
      feedUrl: "http://example.com/feed2.xml",
      description: "Science news and research",
      link: "http://example.com/science",
      lastUpdated: "2023-01-01T00:00:00Z",
      lastRefreshed: "2023-01-01T00:00:00Z",
      published: "2023-01-01T00:00:00Z",
      author: "Science Team",
      language: "en",
      favicon: "http://example.com/science/favicon.ico",
      categories: ["science"],
      items: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    // Clear the API service cache
    (apiService as any).cache.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Feed Fetching", () => {
    const mockItems: FeedItem[] = [
      {
        type: "article",
        id: "item-1",
        title: "Breaking Tech News",
        description: "Amazing breakthrough in AI",
        link: "http://example.com/article-1",
        author: "John Doe",
        published: "2023-01-01T12:00:00Z",
        content: "<p>Article content here</p>",
        created: "2023-01-01T12:00:00Z",
        content_encoded: "<p>Article content here</p>",
        categories: ["ai", "technology"],
        enclosures: null,
        thumbnail: "http://example.com/thumb1.jpg",
        thumbnailColor: "#6496c8",
        thumbnailColorComputed: "#6496c8",
        siteTitle: "Tech Blog",
        siteName: "Tech Blog",
        feedTitle: "Tech Blog RSS",
        feedUrl: "http://example.com/feed1.xml",
        favicon: "http://example.com/favicon.ico",
        favorite: false,
      },
    ];

    it("should load and display feeds on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          feeds: mockFeeds.map((feed) => ({ ...feed, items: mockItems })),
        }),
      });

      render(<FeedManager />);

      // Should show loading state initially
      expect(screen.getByRole("status")).toHaveTextContent("Loading feeds...");

      // Wait for feeds to load
      await waitFor(() => {
        expect(screen.getByTestId("feeds-list")).toBeInTheDocument();
      });

      // Check feeds are displayed
      expect(screen.getByTestId("feed-feed-1")).toHaveTextContent(
        "Tech Blog RSS",
      );
      expect(screen.getByTestId("feed-feed-2")).toHaveTextContent(
        "Science Daily Feed",
      );

      // Check items are displayed
      expect(screen.getByTestId("item-item-1")).toHaveTextContent(
        "Breaking Tech News",
      );

      // Check success notification
      expect(toast.success).toHaveBeenCalledWith("Feeds loaded successfully");
    });

    it("should handle feed loading errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Error: Network error",
        );
      });

      expect(toast.error).toHaveBeenCalledWith("Network error");
    });

    it("should refresh feeds when refresh button is clicked", async () => {
      const user = createUser();

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: mockFeeds }),
      });

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByTestId("feeds-list")).toBeInTheDocument();
      });

      // Mock refresh response with updated feeds
      const updatedFeeds = mockFeeds.map((feed) => ({
        ...feed,
        lastRefreshed: "2023-01-02T00:00:00Z",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: updatedFeeds }),
      });

      // Click refresh button
      const refreshButton = screen.getByText("Refresh All");
      await user.click(refreshButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Feeds refreshed successfully",
        );
      });

      // Verify API was called twice (initial + refresh)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should add a new feed", async () => {
      const user = createUser();

      // Initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: mockFeeds }),
      });

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByTestId("feeds-list")).toBeInTheDocument();
      });

      // Mock add feed response
      const newFeed: Feed = {
        type: "rss",
        guid: "feed-3",
        status: "active",
        siteTitle: "New Blog",
        siteName: "New Blog",
        feedTitle: "New Blog Feed",
        feedUrl: "http://example.com/new-feed.xml",
        description: "A new blog",
        link: "http://example.com/new",
        lastUpdated: "2023-01-01T00:00:00Z",
        lastRefreshed: "2023-01-01T00:00:00Z",
        published: "2023-01-01T00:00:00Z",
        author: "New Author",
        language: "en",
        favicon: "http://example.com/new/favicon.ico",
        categories: ["general"],
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [newFeed] }),
      });

      // Click add feed button
      const addButton = screen.getByText("Add Feed");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("feed-feed-3")).toHaveTextContent(
          "New Blog Feed",
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Feed added successfully");
    });
  });

  describe("Reader View", () => {
    const mockReaderView: ReaderViewResponse = {
      url: "http://example.com/article-1",
      status: "success",
      content:
        "<h1>Article Title</h1><p>This is the article content in reader mode.</p>",
      title: "Article Title",
      siteName: "Tech Blog",
      image: "http://example.com/hero.jpg",
      favicon: "http://example.com/favicon.ico",
      textContent: "Article Title\nThis is the article content in reader mode.",
      markdown:
        "# Article Title\n\nThis is the article content in reader mode.",
    };

    it("should load reader view when article is clicked", async () => {
      const user = createUser();

      // Initial load with items
      const feedsWithItems = [
        {
          ...mockFeeds[0],
          items: [
            {
              type: "article",
              id: "item-1",
              title: "Test Article",
              description: "Test description",
              link: "http://example.com/article-1",
              author: "Test Author",
              published: "2023-01-01T00:00:00Z",
              content: "<p>Preview content</p>",
              created: "2023-01-01T00:00:00Z",
              content_encoded: "<p>Preview content</p>",
              categories: "tech",
              enclosures: null,
              thumbnail: "http://example.com/thumb.jpg",
              thumbnailColor: { r: 255, g: 255, b: 255 },
              thumbnailColorComputed: "#ffffff",
              siteTitle: "Tech Blog",
              siteName: "Tech Blog",
              feedTitle: "Tech Blog RSS",
              feedUrl: "http://example.com/feed1.xml",
              favicon: "http://example.com/favicon.ico",
              favorite: false,
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: feedsWithItems }),
      });

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByTestId("item-item-1")).toBeInTheDocument();
      });

      // Mock reader view response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockReaderView],
      });

      // Click reader view button
      const readerButton = screen.getByText("View Reader Mode");
      await user.click(readerButton);

      await waitFor(() => {
        expect(screen.getByTestId("reader-view")).toBeInTheDocument();
      });

      expect(screen.getByTestId("reader-view")).toHaveTextContent(
        "Article Title",
      );
      expect(screen.getByTestId("reader-view")).toHaveTextContent(
        "This is the article content in reader mode.",
      );
    });

    it("should handle reader view errors", async () => {
      const user = createUser();

      // Initial load with items
      const feedsWithItems = [
        {
          ...mockFeeds[0],
          items: [
            {
              type: "article",
              id: "item-1",
              title: "Test Article",
              description: "Test description",
              link: "http://example.com/article-1",
              author: "Test Author",
              published: "2023-01-01T00:00:00Z",
              content: "<p>Preview content</p>",
              created: "2023-01-01T00:00:00Z",
              content_encoded: "<p>Preview content</p>",
              categories: "tech",
              enclosures: null,
              thumbnail: "http://example.com/thumb.jpg",
              thumbnailColor: { r: 255, g: 255, b: 255 },
              thumbnailColorComputed: "#ffffff",
              siteTitle: "Tech Blog",
              siteName: "Tech Blog",
              feedTitle: "Tech Blog RSS",
              feedUrl: "http://example.com/feed1.xml",
              favicon: "http://example.com/favicon.ico",
              favorite: false,
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: feedsWithItems }),
      });

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByTestId("item-item-1")).toBeInTheDocument();
      });

      // Mock reader view error
      mockFetch.mockRejectedValueOnce(new Error("Failed to extract content"));

      // Click reader view button
      const readerButton = screen.getByText("View Reader Mode");
      await user.click(readerButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load reader view");
      });
    });
  });

  describe("Cache Behavior", () => {
    it("should use cached data on subsequent requests", async () => {
      const mockResponse = {
        feeds: [
          {
            type: "rss",
            guid: "feed-1",
            status: "active",
            siteTitle: "Tech Blog",
            feedTitle: "Tech Blog RSS",
            feedUrl: "http://example.com/feed1.xml",
            description: "Latest tech news",
            link: "http://example.com",
            lastUpdated: "2023-01-01T00:00:00Z",
            lastRefreshed: "2023-01-01T00:00:00Z",
            published: "2023-01-01T00:00:00Z",
            author: "Tech Team",
            language: "en",
            favicon: "http://example.com/favicon.ico",
            categories: ["technology"],
            items: [],
          },
        ],
      };

      // First call - should hit API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First request
      const result1 = await apiService.fetchFeeds([
        "http://example.com/feed1.xml",
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const result2 = await apiService.fetchFeeds([
        "http://example.com/feed1.xml",
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call

      expect(result1).toEqual(result2);
    });

    it("should bypass cache when refreshing", async () => {
      const mockResponse = {
        feeds: [
          {
            type: "rss",
            guid: "feed-1",
            status: "active",
            siteTitle: "Tech Blog",
            feedTitle: "Tech Blog RSS",
            feedUrl: "http://example.com/feed1.xml",
            description: "Latest tech news",
            link: "http://example.com",
            lastUpdated: "2023-01-01T00:00:00Z",
            lastRefreshed: "2023-01-01T00:00:00Z",
            published: "2023-01-01T00:00:00Z",
            author: "Tech Team",
            language: "en",
            favicon: "http://example.com/favicon.ico",
            categories: ["technology"],
            items: [],
          },
        ],
      };

      // First call - populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiService.fetchFeeds(["http://example.com/feed1.xml"]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Refresh call - should bypass cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockResponse,
          feeds: mockResponse.feeds.map((f) => ({
            ...f,
            lastRefreshed: "2023-01-02T00:00:00Z",
          })),
        }),
      });

      const refreshResult = await apiService.refreshFeeds([
        "http://example.com/feed1.xml",
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(refreshResult.feeds[0].lastRefreshed).toBe("2023-01-02T00:00:00Z");
    });
  });

  describe("Error Handling", () => {
    it("should handle different HTTP error codes", async () => {
      const errorCases = [
        { status: 400, message: "Bad Request" },
        { status: 401, message: "Unauthorized" },
        { status: 403, message: "Forbidden" },
        { status: 404, message: "Not Found" },
        { status: 429, message: "Too Many Requests" },
        { status: 500, message: "Internal Server Error" },
        { status: 503, message: "Service Unavailable" },
      ];

      for (const { status, message } of errorCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: message,
        });

        await expect(
          apiService.fetchFeeds(["http://example.com/feed.xml"]),
        ).rejects.toThrow(`HTTP error! status: ${status}`);
      }
    });

    it("should handle network timeouts", async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout")), 5000);
          }),
      );

      const fetchPromise = apiService.fetchFeeds([
        "http://example.com/feed.xml",
      ]);

      jest.advanceTimersByTime(5000);

      await expect(fetchPromise).rejects.toThrow("Request timeout");

      jest.useRealTimers();
    });
  });

  describe("Offline Mode", () => {
    it("should return cached data when offline", async () => {
      const mockResponse = {
        feeds: [
          {
            type: "rss",
            guid: "feed-1",
            status: "active",
            siteTitle: "Tech Blog",
            feedTitle: "Tech Blog RSS",
            feedUrl: "http://example.com/feed1.xml",
            description: "Latest tech news",
            link: "http://example.com",
            lastUpdated: "2023-01-01T00:00:00Z",
            lastRefreshed: "2023-01-01T00:00:00Z",
            published: "2023-01-01T00:00:00Z",
            author: "Tech Team",
            language: "en",
            favicon: "http://example.com/favicon.ico",
            categories: ["technology"],
            items: [],
          },
        ],
      };

      // First call - populate cache while online
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const onlineResult = await apiService.fetchFeeds([
        "http://example.com/feed1.xml",
      ]);

      // Simulate offline - network error
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Should still get cached data
      const offlineResult = await apiService.fetchFeeds([
        "http://example.com/feed1.xml",
      ]);
      expect(offlineResult).toEqual(onlineResult);
    });

    it("should fail gracefully when offline without cache", async () => {
      // Simulate offline - network error
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<FeedManager />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Error: Network error",
        );
      });

      // Should show retry button
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });
});
