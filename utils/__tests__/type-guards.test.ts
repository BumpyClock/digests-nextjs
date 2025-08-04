/**
 * Test suite for type guard utilities
 */

import {
  isApiError,
  isApiResponse,
  isPaginatedResponse,
  isEnclosure,
  isFeedItem,
  isFeed,
  isArticle,
  isArticleMetadata,
  isArrayOf,
  isObject,
  createTypeGuard,
  validateType,
  safeParse,
} from "../type-guards";

describe("Type Guards", () => {
  describe("isApiError", () => {
    it("should validate valid ApiError", () => {
      const validError = {
        code: "ERR_001",
        message: "Something went wrong",
        statusCode: 500,
      };
      expect(isApiError(validError)).toBe(true);
    });

    it("should validate ApiError without statusCode", () => {
      const validError = {
        code: "ERR_001",
        message: "Something went wrong",
      };
      expect(isApiError(validError)).toBe(true);
    });

    it("should reject invalid ApiError", () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError({})).toBe(false);
      expect(isApiError({ code: 123, message: "test" })).toBe(false);
      expect(isApiError({ code: "ERR", message: 123 })).toBe(false);
    });
  });

  describe("isApiResponse", () => {
    it("should validate valid ApiResponse", () => {
      const validResponse = {
        success: true,
        data: { id: 1, name: "Test" },
        message: "Success",
      };
      expect(isApiResponse(validResponse)).toBe(true);
    });

    it("should validate ApiResponse with error", () => {
      const errorResponse = {
        success: false,
        error: {
          code: "ERR_001",
          message: "Failed",
        },
      };
      expect(isApiResponse(errorResponse)).toBe(true);
    });

    it("should validate ApiResponse with data validator", () => {
      const isUser = (
        value: unknown,
      ): value is { id: number; name: string } => {
        return (
          isObject(value) &&
          typeof (value as any).id === "number" &&
          typeof (value as any).name === "string"
        );
      };

      const validResponse = {
        success: true,
        data: { id: 1, name: "Test" },
      };
      expect(isApiResponse(validResponse, isUser)).toBe(true);

      const invalidResponse = {
        success: true,
        data: { id: "1", name: "Test" },
      };
      expect(isApiResponse(invalidResponse, isUser)).toBe(false);
    });
  });

  describe("isFeedItem", () => {
    it("should validate valid FeedItem", () => {
      const validItem = {
        type: "article",
        id: "123",
        title: "Test Article",
        description: "Test description",
        link: "https://example.com",
        author: "John Doe",
        published: "2024-01-01",
        content: "Content here",
        created: "2024-01-01",
        content_encoded: "<p>Content</p>",
        categories: "tech,news",
        enclosures: null,
        thumbnail: "https://example.com/thumb.jpg",
        thumbnailColor: { r: 255, g: 255, b: 255 },
        thumbnailColorComputed: "#ffffff",
        siteTitle: "Example Site",
        feedTitle: "Example Feed",
        feedUrl: "https://example.com/feed",
        favicon: "https://example.com/favicon.ico",
      };
      expect(isFeedItem(validItem)).toBe(true);
    });

    it("should validate FeedItem with optional fields", () => {
      const validItem = {
        type: "article",
        id: "123",
        title: "Test Article",
        description: "Test description",
        link: "https://example.com",
        author: "John Doe",
        published: "2024-01-01",
        content: "Content here",
        created: "2024-01-01",
        content_encoded: "<p>Content</p>",
        categories: "tech,news",
        enclosures: [
          {
            url: "https://example.com/audio.mp3",
            type: "audio/mp3",
            length: "12345",
          },
        ],
        thumbnail: "https://example.com/thumb.jpg",
        thumbnailColor: { r: 255, g: 255, b: 255 },
        thumbnailColorComputed: "#ffffff",
        siteTitle: "Example Site",
        feedTitle: "Example Feed",
        feedUrl: "https://example.com/feed",
        favicon: "https://example.com/favicon.ico",
        favorite: true,
        duration: 3600,
        itunesEpisode: "5",
        itunesSeason: "2",
        feedImage: "https://example.com/feed-image.jpg",
      };
      expect(isFeedItem(validItem)).toBe(true);
    });

    it("should reject invalid FeedItem", () => {
      const invalidItem = {
        type: "article",
        id: 123, // Should be string
        title: "Test",
      };
      expect(isFeedItem(invalidItem)).toBe(false);
    });
  });

  describe("isFeed", () => {
    it("should validate valid Feed", () => {
      const validFeed = {
        type: "rss",
        guid: "feed-123",
        status: "active",
        siteTitle: "Example Site",
        feedTitle: "Example Feed",
        feedUrl: "https://example.com/feed",
        description: "Feed description",
        link: "https://example.com",
        lastUpdated: "2024-01-01T00:00:00Z",
        lastRefreshed: "2024-01-01T00:00:00Z",
        published: "2024-01-01T00:00:00Z",
        author: "John Doe",
        language: "en",
        favicon: "https://example.com/favicon.ico",
        categories: "tech,news",
      };
      expect(isFeed(validFeed)).toBe(true);
    });

    it("should validate Feed with null author", () => {
      const validFeed = {
        type: "rss",
        guid: "feed-123",
        status: "active",
        siteTitle: "Example Site",
        feedTitle: "Example Feed",
        feedUrl: "https://example.com/feed",
        description: "Feed description",
        link: "https://example.com",
        lastUpdated: "2024-01-01T00:00:00Z",
        lastRefreshed: "2024-01-01T00:00:00Z",
        published: "2024-01-01T00:00:00Z",
        author: null,
        language: "en",
        favicon: "https://example.com/favicon.ico",
        categories: "tech,news",
      };
      expect(isFeed(validFeed)).toBe(true);
    });
  });

  describe("isArticle", () => {
    it("should validate valid Article", () => {
      const validArticle = {
        url: "https://example.com/article",
        status: "success",
        content: "<p>Article content</p>",
        title: "Article Title",
        siteName: "Example Site",
        image: "https://example.com/image.jpg",
        favicon: "https://example.com/favicon.ico",
        textContent: "Article content",
        markdown: "# Article Title\n\nArticle content",
      };
      expect(isArticle(validArticle)).toBe(true);
    });

    it("should validate Article with error", () => {
      const articleWithError = {
        url: "https://example.com/article",
        status: "error",
        content: "",
        title: "",
        siteName: "",
        image: "",
        favicon: "",
        textContent: "",
        markdown: "",
        error: "Failed to fetch article",
      };
      expect(isArticle(articleWithError)).toBe(true);
    });
  });

  describe("createTypeGuard", () => {
    it("should create custom type guard", () => {
      type User = {
        id: number;
        name: string;
        email: string;
      };

      const isUser = createTypeGuard<User>({
        id: (v) => typeof v === "number",
        name: (v) => typeof v === "string",
        email: (v) => typeof v === "string" && v.includes("@"),
      });

      expect(isUser({ id: 1, name: "John", email: "john@example.com" })).toBe(
        true,
      );
      expect(isUser({ id: "1", name: "John", email: "john@example.com" })).toBe(
        false,
      );
      expect(isUser({ id: 1, name: "John", email: "invalid" })).toBe(false);
    });
  });

  describe("validateType", () => {
    it("should validate and return value on success", () => {
      const data = { code: "ERR", message: "Error" };
      const result = validateType(data, isApiError, "ApiError");
      expect(result).toBe(data);
    });

    it("should throw on validation failure", () => {
      const data = { invalid: "data" };
      expect(() => validateType(data, isApiError, "ApiError")).toThrow(
        "Invalid ApiError: validation failed",
      );
    });
  });

  describe("safeParse", () => {
    it("should return success result for valid data", () => {
      const data = { code: "ERR", message: "Error" };
      const result = safeParse(data, isApiError, "ApiError");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(data);
      }
    });

    it("should return error result for invalid data", () => {
      const data = { invalid: "data" };
      const result = safeParse(data, isApiError, "ApiError");

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error).toBeInstanceOf(TypeError);
        expect(result.error.message).toBe(
          "Invalid ApiError: validation failed",
        );
      }
    });
  });
});
