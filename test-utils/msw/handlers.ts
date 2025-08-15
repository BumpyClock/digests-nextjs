// MSW request handlers for API mocking
import { http, HttpResponse } from "msw";
import {
  createMockFeeds,
  createMockFeedItems,
  createMockArticle,
} from "../factories";
import type { Feed, FeedItem, ReaderViewResponse } from "@/types";

// Base API URL - adjust based on your actual API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Convert mock factories to match API types
const convertToApiFeed = (mockFeed: Feed): Feed => ({
  ...mockFeed,
  items: mockFeed.items || [],
});

const convertToApiFeedItem = (mockItem: FeedItem, feed: Feed): FeedItem => ({
  ...mockItem,
  siteTitle: feed.siteTitle,
  feedTitle: feed.feedTitle,
  feedUrl: feed.feedUrl,
  favicon: feed.favicon,
});

export const handlers = [
  // POST /parse - Parse/fetch feeds (main API endpoint)
  http.post(
    `${API_BASE_URL}/parse`,
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { urls: string[] };
      const feeds: Feed[] = [];

      // Create mock feeds for each URL
      body.urls.forEach((url, index) => {
        const mockFeed = createMockFeeds(1, { feedUrl: url })[0];
        const apiFeed = convertToApiFeed(mockFeed);

        // Add items to the feed
        const mockItems = createMockFeedItems(5, mockFeed.feedUrl);
        apiFeed.items = mockItems.map((item) =>
          convertToApiFeedItem(item, apiFeed),
        );

        feeds.push(apiFeed);
      });

      return HttpResponse.json({ feeds });
    },
  ),

  // POST /getreaderview - Get reader view for URLs
  http.post(
    `${API_BASE_URL}/getreaderview`,
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { urls: string[] };

      const readerViews: ReaderViewResponse[] = body.urls.map((url) => ({
        url,
        status: "success",
        content:
          "<h1>Article Title</h1><p>This is the article content in reader mode.</p>",
        title: "Article Title",
        siteName: "Example Site",
        image: "http://example.com/image.jpg",
        favicon: "http://example.com/favicon.ico",
        textContent:
          "Article Title\nThis is the article content in reader mode.",
        markdown:
          "# Article Title\n\nThis is the article content in reader mode.",
      }));

      return HttpResponse.json(readerViews);
    },
  ),

  // Legacy endpoints (for backward compatibility)
  // GET /api/feeds - Get all feeds
  http.get(`${API_BASE_URL}/api/feeds`, () => {
    const mockFeeds = createMockFeeds(5);
    const apiFeeds = mockFeeds.map(convertToApiFeed);
    return HttpResponse.json({ feeds: apiFeeds });
  }),

  // GET /api/feeds/:feedId/items - Get feed items
  http.get(
    `${API_BASE_URL}/api/feeds/:feedId/items`,
    ({ params }: { params: Record<string, string> }) => {
      const { feedId } = params;
      const mockFeed = createMockFeeds(1, { guid: feedId as string })[0];
      const apiFeed = convertToApiFeed(mockFeed);
      const mockItems = createMockFeedItems(10, feedId as string);
      const apiItems = mockItems.map((item) =>
        convertToApiFeedItem(item, apiFeed),
      );
      return HttpResponse.json({ items: apiItems });
    },
  ),

  // GET /api/reader/:itemId - Get reader view of an article
  http.get(
    `${API_BASE_URL}/api/reader/:itemId`,
    ({ params }: { params: Record<string, string> }) => {
      const { itemId } = params;
      const article = createMockArticle({
        url: `https://example.com/article-${itemId}`,
      });
      const readerView: ReaderViewResponse = {
        url: article.url,
        status: "success",
        content: article.content,
        title: article.title,
        siteName: article.siteName,
        image: article.image || "",
        favicon: "http://example.com/favicon.ico",
        textContent: article.content.replace(/<[^>]*>/g, ""),
        markdown: `# ${article.title}\n\n${article.content.replace(/<[^>]*>/g, "")}`,
      };
      return HttpResponse.json(readerView);
    },
  ),

  // POST /api/feeds/:feedId/refresh - Refresh a feed
  http.post(`${API_BASE_URL}/api/feeds/:feedId/refresh`, () => {
    return HttpResponse.json({
      success: true,
      message: "Feed refreshed successfully",
    });
  }),

  // POST /api/feeds - Add a new feed
  http.post(
    `${API_BASE_URL}/api/feeds`,
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { url: string };
      const mockFeed = createMockFeeds(1, { feedUrl: body.url })[0];
      const apiFeed = convertToApiFeed(mockFeed);
      return HttpResponse.json({ feed: apiFeed });
    },
  ),

  // DELETE /api/feeds/:feedId - Delete a feed
  http.delete(`${API_BASE_URL}/api/feeds/:feedId`, () => {
    return HttpResponse.json({ success: true });
  }),

  // PUT /api/items/:itemId/read - Mark item as read
  http.put(`${API_BASE_URL}/api/items/:itemId/read`, () => {
    return HttpResponse.json({ success: true });
  }),

  // PUT /api/items/:itemId/starred - Toggle starred status
  http.put(`${API_BASE_URL}/api/items/:itemId/starred`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Error handlers for testing error scenarios
  http.get(`${API_BASE_URL}/api/feeds/error`, () => {
    return HttpResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 500 },
    );
  }),

  http.get(`${API_BASE_URL}/api/offline`, () => {
    return HttpResponse.error();
  }),
];

// Handler overrides for specific test scenarios
export const errorHandlers = {
  feeds: http.get(`${API_BASE_URL}/api/feeds`, () => {
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }),

  feedItems: http.get(`${API_BASE_URL}/api/feeds/:feedId/items`, () => {
    return HttpResponse.json({ error: "Feed not found" }, { status: 404 });
  }),

  readerView: http.get(`${API_BASE_URL}/api/reader/:itemId`, () => {
    return HttpResponse.json({ error: "Article not found" }, { status: 404 });
  }),

  networkError: http.get("*", () => {
    return HttpResponse.error();
  }),
};

// Offline mode handlers
export const offlineHandlers = [
  http.get("*", () => {
    return HttpResponse.error();
  }),
  http.post("*", () => {
    return HttpResponse.error();
  }),
  http.put("*", () => {
    return HttpResponse.error();
  }),
  http.delete("*", () => {
    return HttpResponse.error();
  }),
];
