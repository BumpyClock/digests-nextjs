// Mock data factories for tests
import { Feed, FeedItem } from "@/types/feed";
import { Article } from "@/types/article";

// Factory functions
export const createMockFeed = (overrides?: Partial<Feed>): Feed => ({
  type: "feed",
  guid: "feed-1",
  status: "active",
  siteTitle: "Test Site",
  siteName: "Test Site",
  feedTitle: "Test Feed",
  feedUrl: "https://example.com/feed.xml",
  description: "A test feed for unit tests",
  link: "https://example.com",
  lastUpdated: new Date().toISOString(),
  lastRefreshed: new Date().toISOString(),
  published: new Date().toISOString(),
  author: "Test Author",
  language: "en",
  favicon: "https://example.com/favicon.ico",
  categories: ["Technology"],
  ...overrides,
});

export const createMockFeedItem = (
  overrides?: Partial<FeedItem>,
): FeedItem => ({
  type: "article",
  id: "item-1",
  title: "Test Article",
  description: "This is a test article description",
  link: "https://example.com/article-1",
  author: "Test Author",
  published: new Date().toISOString(),
  pubDate: new Date().toISOString(),
  content: "<p>This is the full content of the test article.</p>",
  created: new Date().toISOString(),
  content_encoded: "<p>This is the full content of the test article.</p>",
  categories: ["Technology"],
  enclosures: null,
  thumbnail: "https://example.com/thumbnail.jpg",
  thumbnailColor: "#ffffff",
  thumbnailColorComputed: "#000000",
  siteTitle: "Test Site",
  siteName: "Test Site",
  feedTitle: "Test Feed",
  feedUrl: "https://example.com/feed.xml",
  favicon: "https://example.com/favicon.ico",
  favorite: false,
  ...overrides,
});

export const createMockArticle = (overrides?: Partial<Article>): Article => ({
  url: "https://example.com/article-1",
  status: "success",
  content:
    "<h1>Test Article</h1><p>This is the full content of the test article with <strong>HTML formatting</strong>.</p>",
  title: "Test Article Title",
  siteName: "Test Site",
  image: "https://example.com/thumbnail.jpg",
  favicon: "https://example.com/favicon.ico",
  textContent:
    "Test Article. This is the full content of the test article with HTML formatting.",
  markdown:
    "# Test Article\n\nThis is the full content of the test article with **HTML formatting**.",
  ...overrides,
});

// Batch creation utilities
export const createMockFeeds = (
  count: number,
  overrides?: Partial<Feed>,
): Feed[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockFeed({
      guid: `feed-${i + 1}`,
      feedTitle: `Test Feed ${i + 1}`,
      link: `https://example.com/feed-${i + 1}`,
      feedUrl: `https://example.com/feed-${i + 1}.xml`,
      ...overrides,
    }),
  );
};

export const createMockFeedItems = (
  count: number,
  feedUrl: string = "https://example.com/feed.xml",
  overrides?: Partial<FeedItem>,
): FeedItem[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockFeedItem({
      id: `item-${i + 1}`,
      feedUrl,
      title: `Test Article ${i + 1}`,
      link: `https://example.com/article-${i + 1}`,
      published: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), // Each item 1 day older
      ...overrides,
    }),
  );
};

export const createMockArticles = (
  count: number,
  overrides?: Partial<Article>,
): Article[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockArticle({
      title: `Test Article ${i + 1}`,
      url: `https://example.com/article-${i + 1}`,
      ...overrides,
    }),
  );
};

// Error response factory
export const createMockErrorResponse = (
  status: number = 500,
  message: string = "Internal Server Error",
) => ({
  status,
  message,
  error: true,
});

// API response factories
export const createMockApiResponse = <T>(
  data: T,
  options?: { status?: number; headers?: Record<string, string> },
) => ({
  ok: true,
  status: options?.status || 200,
  headers: options?.headers || {},
  data,
});

export const createMockApiError = (
  status: number = 500,
  message: string = "API Error",
) => ({
  ok: false,
  status,
  message,
  error: new Error(message),
});
