/**
 * Unit tests for the API service layer
 * Testing the direct API implementation that replaced worker services
 */

import { apiService } from "../api-service";
import type { Feed, FeedItem, ReaderViewResponse } from "@/types";
import { Logger } from "@/utils/logger";

// Mock the logger to prevent console output during tests
jest.mock("@/utils/logger", () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the API config store
jest.mock("@/store/useApiConfigStore", () => ({
  getApiConfig: jest.fn(() => ({
    baseUrl: "http://test-api.example.com",
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    mockFetch.mockReset();
    // Clear the cache by creating a new instance
    (apiService as any).cache.clear();
  });

  describe("Configuration", () => {
    it("should initialize with correct base URL from config", () => {
      expect((apiService as any).baseUrl).toBe("http://test-api.example.com");
    });

    it("should update API URL and clear cache", () => {
      const clearSpy = jest.spyOn((apiService as any).cache, "clear");

      apiService.updateApiUrl("http://new-api.example.com");

      expect((apiService as any).baseUrl).toBe("http://new-api.example.com");
      expect(clearSpy).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        "[ApiService] API URL updated to http://new-api.example.com",
      );
    });

    it("should update cache TTL", () => {
      const setTTLSpy = jest.spyOn((apiService as any).cache, "setTTL");

      apiService.updateCacheTtl(60000); // 1 minute

      expect(setTTLSpy).toHaveBeenCalledWith(60000);
      expect(Logger.debug).toHaveBeenCalledWith(
        "[ApiService] Cache TTL updated to 60000ms",
      );
    });
  });

  describe("fetchFeeds", () => {
    const mockFeeds: Feed[] = [
      {
        type: "rss",
        guid: "feed-1",
        status: "active",
        siteTitle: "Test Site",
        siteName: "Test Site",
        feedTitle: "Test Feed",
        feedUrl: "http://example.com/feed.xml",
        description: "Test description",
        link: "http://example.com",
        lastUpdated: "2023-01-01T00:00:00Z",
        lastRefreshed: "2023-01-01T00:00:00Z",
        published: "2023-01-01T00:00:00Z",
        author: "Test Author",
        language: "en",
        favicon: "http://example.com/favicon.ico",
        categories: ["tech"],
        items: [],
      },
    ];

    const mockItems: FeedItem[] = [
      {
        type: "article",
        id: "item-1",
        title: "Test Article",
        description: "Test description",
        link: "http://example.com/article-1",
        author: "Test Author",
        published: "2023-01-01T00:00:00Z",
        content: "<p>Test content</p>",
        created: "2023-01-01T00:00:00Z",
        content_encoded: "<p>Test content</p>",
        categories: ["tech"],
        enclosures: null,
        thumbnail: "http://example.com/thumb.jpg",
        thumbnailColor: "#ffffff",
        thumbnailColorComputed: "#000000",
        siteTitle: "Test Site",
        siteName: "Test Site",
        feedTitle: "Test Feed",
        feedUrl: "http://example.com/feed.xml",
        favicon: "http://example.com/favicon.ico",
        favorite: false,
      },
    ];

    it("should fetch feeds successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: mockFeeds }),
      });

      const result = await apiService.fetchFeeds([
        "http://example.com/feed.xml",
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.example.com/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: ["http://example.com/feed.xml"] }),
        },
      );
      expect(result.feeds).toEqual(mockFeeds);
      expect(result.items).toEqual([]);
    });

    it("should fetch feeds with items", async () => {
      const feedsWithItems = [
        {
          ...mockFeeds[0],
          items: mockItems,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: feedsWithItems }),
      });

      const result = await apiService.fetchFeeds([
        "http://example.com/feed.xml",
      ]);

      expect(result.feeds).toHaveLength(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        ...mockItems[0],
        feedUrl: "http://example.com/feed.xml",
      });
    });

    it("should return cached results on subsequent calls", async () => {
      // First call - should hit the API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: mockFeeds }),
      });

      const result1 = await apiService.fetchFeeds([
        "http://example.com/feed.xml",
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should return from cache
      const result2 = await apiService.fetchFeeds([
        "http://example.com/feed.xml",
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
      expect(result2).toEqual(result1);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Cache hit"),
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        apiService.fetchFeeds(["http://example.com/feed.xml"]),
      ).rejects.toThrow("HTTP error! status: 500");

      expect(Logger.error).toHaveBeenCalledWith(
        "[ApiService] Error fetching feeds:",
        expect.any(Error),
      );
    });

    it("should handle invalid API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "response" }),
      });

      await expect(
        apiService.fetchFeeds(["http://example.com/feed.xml"]),
      ).rejects.toThrow("Invalid response from API");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        apiService.fetchFeeds(["http://example.com/feed.xml"]),
      ).rejects.toThrow("Network error");

      expect(Logger.error).toHaveBeenCalledWith(
        "[ApiService] Error fetching feeds:",
        expect.any(Error),
      );
    });
  });

  describe("refreshFeeds", () => {
    const mockFeeds: Feed[] = [
      {
        type: "rss",
        guid: "feed-1",
        status: "active",
        siteTitle: "Test Site",
        siteName: "Test Site",
        feedTitle: "Test Feed",
        feedUrl: "http://example.com/feed.xml",
        description: "Test description",
        link: "http://example.com",
        lastUpdated: "2023-01-01T00:00:00Z",
        lastRefreshed: "2023-01-01T00:00:00Z",
        published: "2023-01-01T00:00:00Z",
        author: "Test Author",
        language: "en",
        favicon: "http://example.com/favicon.ico",
        categories: ["tech"],
        items: [],
      },
    ];

    it("should clear cache and fetch fresh data", async () => {
      const deleteSpy = jest.spyOn((apiService as any).cache, "delete");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: mockFeeds }),
      });

      await apiService.refreshFeeds(["http://example.com/feed.xml"]);

      expect(deleteSpy).toHaveBeenCalledWith(
        "feeds:http://example.com/feed.xml",
      );
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle refresh errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Refresh failed"));

      await expect(
        apiService.refreshFeeds(["http://example.com/feed.xml"]),
      ).rejects.toThrow("Refresh failed");

      expect(Logger.error).toHaveBeenCalledWith(
        "[ApiService] Error refreshing feeds:",
        expect.any(Error),
      );
    });
  });

  describe("fetchReaderView", () => {
    const mockReaderView: ReaderViewResponse = {
      url: "http://example.com/article",
      status: "success",
      content: "<h1>Article Title</h1><p>Article content</p>",
      title: "Article Title",
      siteName: "Example Site",
      image: "http://example.com/image.jpg",
      favicon: "http://example.com/favicon.ico",
      textContent: "Article Title\nArticle content",
      markdown: "# Article Title\n\nArticle content",
    };

    it("should fetch reader view successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockReaderView],
      });

      const result = await apiService.fetchReaderView(
        "http://example.com/article",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.example.com/getreaderview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: ["http://example.com/article"] }),
        },
      );
      expect(result).toEqual(mockReaderView);
    });

    it("should return cached reader view on subsequent calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockReaderView],
      });

      const result1 = await apiService.fetchReaderView(
        "http://example.com/article",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await apiService.fetchReaderView(
        "http://example.com/article",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(result1);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Cache hit"),
      );
    });

    it("should handle empty reader view response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(
        apiService.fetchReaderView("http://example.com/article"),
      ).rejects.toThrow("Invalid response from API");
    });

    it("should handle reader view errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        apiService.fetchReaderView("http://example.com/article"),
      ).rejects.toThrow("HTTP error! status: 404");

      expect(Logger.error).toHaveBeenCalledWith(
        "[ApiService] Error fetching reader view:",
        expect.any(Error),
      );
    });
  });

  describe("Feed operations", () => {
    const mockFeed: Feed = {
      type: "rss",
      guid: "feed-1",
      status: "active",
      siteTitle: "Test Site",
      siteName: "Test Site",
      feedTitle: "Test Feed",
      feedUrl: "http://example.com/feed.xml",
      description: "Test description",
      link: "http://example.com",
      lastUpdated: "2023-01-01T00:00:00Z",
      lastRefreshed: "2023-01-01T00:00:00Z",
      published: "2023-01-01T00:00:00Z",
      author: "Test Author",
      language: "en",
      favicon: "http://example.com/favicon.ico",
      categories: ["tech"],
      items: [],
    };

    describe("getAll", () => {
      it("should fetch all feeds", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [mockFeed] }),
        });

        const feeds = await apiService.feeds.getAll();
        expect(feeds).toEqual([mockFeed]);
      });
    });

    describe("getById", () => {
      it("should get feed by ID from cache if available", async () => {
        // Set up cache
        (apiService as any).cache.set("feed:feed-1", mockFeed);

        const feed = await apiService.feeds.getById("feed-1");
        expect(feed).toEqual(mockFeed);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("should fetch feed by ID if not in cache", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [mockFeed] }),
        });

        const feed = await apiService.feeds.getById("feed-1");
        expect(feed).toEqual(mockFeed);
      });

      it("should throw error if feed not found", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] }),
        });

        await expect(apiService.feeds.getById("non-existent")).rejects.toThrow(
          "Feed with id non-existent not found",
        );
      });
    });

    describe("create", () => {
      it("should create a new feed", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [mockFeed] }),
        });

        const feed = await apiService.feeds.create({
          url: "http://example.com/feed.xml",
        });
        expect(feed).toEqual(mockFeed);
      });

      it("should throw error if feed creation fails", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] }),
        });

        await expect(
          apiService.feeds.create({ url: "http://example.com/feed.xml" }),
        ).rejects.toThrow("Failed to add feed");
      });
    });

    describe("update", () => {
      it("should throw not implemented error", async () => {
        await expect(
          apiService.feeds.update("feed-1", { feedTitle: "New Title" }),
        ).rejects.toThrow("Feed update not implemented");
      });
    });

    describe("delete", () => {
      it("should delete feed from cache", async () => {
        const deleteSpy = jest.spyOn((apiService as any).cache, "delete");

        await apiService.feeds.delete("feed-1");
        expect(deleteSpy).toHaveBeenCalledWith("feed:feed-1");
      });
    });

    describe("refresh", () => {
      it("should refresh a specific feed", async () => {
        // First, set up the feed in cache
        (apiService as any).cache.set("feed:feed-1", mockFeed);

        const mockItems: FeedItem[] = [
          {
            type: "article",
            id: "item-1",
            title: "Test Article",
            description: "Test description",
            link: "http://example.com/article-1",
            author: "Test Author",
            published: "2023-01-01T00:00:00Z",
            content: "<p>Test content</p>",
            created: "2023-01-01T00:00:00Z",
            content_encoded: "<p>Test content</p>",
            categories: ["tech"],
            enclosures: null,
            thumbnail: "http://example.com/thumb.jpg",
            thumbnailColor: "#ffffff",
            thumbnailColorComputed: "#ffffff",
            siteTitle: "Test Site",
            siteName: "Test Site",
            feedTitle: "Test Feed",
            feedUrl: "http://example.com/feed.xml",
            favicon: "http://example.com/favicon.ico",
            favorite: false,
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feeds: [{ ...mockFeed, items: mockItems }],
            items: mockItems,
          }),
        });

        const items = await apiService.feeds.refresh("feed-1");
        expect(items).toEqual(mockItems);
      });
    });
  });

  describe("Article operations", () => {
    describe("getByFeed", () => {
      it("should get articles by feed ID", async () => {
        const mockFeed: Feed = {
          type: "rss",
          guid: "feed-1",
          status: "active",
          siteTitle: "Test Site",
          siteName: "Test Site",
          feedTitle: "Test Feed",
          feedUrl: "http://example.com/feed.xml",
          description: "Test description",
          link: "http://example.com",
          lastUpdated: "2023-01-01T00:00:00Z",
          lastRefreshed: "2023-01-01T00:00:00Z",
          published: "2023-01-01T00:00:00Z",
          author: "Test Author",
          language: "en",
          favicon: "http://example.com/favicon.ico",
          categories: ["tech"],
          items: [],
        };

        const mockItems: FeedItem[] = [
          {
            type: "article",
            id: "item-1",
            title: "Test Article",
            description: "Test description",
            link: "http://example.com/article-1",
            author: "Test Author",
            published: "2023-01-01T00:00:00Z",
            content: "<p>Test content</p>",
            created: "2023-01-01T00:00:00Z",
            content_encoded: "<p>Test content</p>",
            categories: ["tech"],
            enclosures: null,
            thumbnail: "http://example.com/thumb.jpg",
            thumbnailColor: "#ffffff",
            thumbnailColorComputed: "#ffffff",
            siteTitle: "Test Site",
            siteName: "Test Site",
            feedTitle: "Test Feed",
            feedUrl: "http://example.com/feed.xml",
            favicon: "http://example.com/favicon.ico",
            favorite: false,
          },
        ];

        // Set up feed in cache
        (apiService as any).cache.set("feed:feed-1", mockFeed);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feeds: [{ ...mockFeed, items: mockItems }],
            items: mockItems,
          }),
        });

        const articles = await apiService.articles.getByFeed("feed-1");
        expect(articles).toEqual(mockItems);
      });
    });

    describe("markAsRead", () => {
      it("should mark article as read (client-side)", async () => {
        await expect(
          apiService.articles.markAsRead("item-1"),
        ).resolves.toBeUndefined();
      });
    });

    describe("markAsUnread", () => {
      it("should mark article as unread (client-side)", async () => {
        await expect(
          apiService.articles.markAsUnread("item-1"),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe("Cache behavior", () => {
    it("should expire cache after TTL", async () => {
      const mockFeed: Feed = {
        type: "rss",
        guid: "feed-1",
        status: "active",
        siteTitle: "Test Site",
        siteName: "Test Site",
        feedTitle: "Test Feed",
        feedUrl: "http://example.com/feed.xml",
        description: "Test description",
        link: "http://example.com",
        lastUpdated: "2023-01-01T00:00:00Z",
        lastRefreshed: "2023-01-01T00:00:00Z",
        published: "2023-01-01T00:00:00Z",
        author: "Test Author",
        language: "en",
        favicon: "http://example.com/favicon.ico",
        categories: ["tech"],
        items: [],
      };

      // Set cache TTL to 100ms for testing
      apiService.updateCacheTtl(100);

      // First call - cache miss
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [mockFeed] }),
      });
      await apiService.fetchFeeds(["http://example.com/feed.xml"]);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second call - should be cache miss due to expiry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [mockFeed] }),
      });
      await apiService.fetchFeeds(["http://example.com/feed.xml"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Cache expired"),
      );
    });
  });

  describe("Performance characteristics", () => {
    it("should complete API calls within performance threshold", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [] }),
      });

      const startTime = performance.now();
      await apiService.fetchFeeds(["http://example.com/feed.xml"]);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 100ms (accounting for test overhead)
      expect(duration).toBeLessThan(100);
    });

    it("should return cached results instantly", async () => {
      // First call to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [] }),
      });
      await apiService.fetchFeeds(["http://example.com/feed.xml"]);

      // Measure cached call
      const startTime = performance.now();
      await apiService.fetchFeeds(["http://example.com/feed.xml"]);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Cached calls should be under 5ms
      expect(duration).toBeLessThan(5);
    });
  });
});

describe("ApiService Error Scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (apiService as any).cache.clear();
  });

  it("should handle malformed JSON responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("Invalid JSON");
  });

  it("should handle timeout errors", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 100),
        ),
    );

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("Request timeout");
  });

  it("should handle API rate limiting (429)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("HTTP error! status: 429");
  });

  it("should handle API server errors (500)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("HTTP error! status: 500");
  });

  it("should handle unauthorized errors (401)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("HTTP error! status: 401");
  });
});

describe("ApiService Offline Behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (apiService as any).cache.clear();
  });

  it("should return cached data when offline", async () => {
    const mockFeeds: Feed[] = [
      {
        type: "rss",
        guid: "feed-1",
        status: "active",
        siteTitle: "Test Site",
        siteName: "Test Site",
        feedTitle: "Test Feed",
        feedUrl: "http://example.com/feed.xml",
        description: "Test description",
        link: "http://example.com",
        lastUpdated: "2023-01-01T00:00:00Z",
        lastRefreshed: "2023-01-01T00:00:00Z",
        published: "2023-01-01T00:00:00Z",
        author: "Test Author",
        language: "en",
        favicon: "http://example.com/favicon.ico",
        categories: ["tech"],
        items: [],
      },
    ];

    // First call - populate cache
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feeds: mockFeeds }),
    });
    await apiService.fetchFeeds(["http://example.com/feed.xml"]);

    // Simulate offline - network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Should still get cached data
    const result = await apiService.fetchFeeds(["http://example.com/feed.xml"]);
    expect(result.feeds).toEqual(mockFeeds);
  });

  it("should fail when offline without cache", async () => {
    // Simulate offline - network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      apiService.fetchFeeds(["http://example.com/feed.xml"]),
    ).rejects.toThrow("Network error");
  });
});
