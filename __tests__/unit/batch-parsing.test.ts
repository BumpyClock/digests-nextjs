// ABOUTME: Unit tests for batch feed parsing functionality
// ABOUTME: Tests the new createBatch method and batch parsing optimizations

import { apiService } from "@/services/api-service";
import { Logger } from "@/utils/logger";
import type {
  CreateBatchDto,
  BatchCreateResponse,
} from "@/services/api-service";

// Mock the dependencies
jest.mock("@/utils/logger");
jest.mock("@/utils/security", () => ({
  validateFeedUrls: jest.fn((urls: string[]) => ({
    valid: urls.filter((url) => url.includes("valid")),
    invalid: urls.filter((url) => !url.includes("valid")),
  })),
  isValidUrl: jest.fn(() => true),
  isValidApiUrl: jest.fn(() => true),
  isValidFeedUrl: jest.fn(() => true),
  generateSecureCacheKey: jest.fn((key: string) =>
    Promise.resolve(`secure_${key}`),
  ),
  SECURITY_CONFIG: { MAX_URL_LENGTH: 2048 },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("Batch Feed Parsing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the API service cache to ensure clean tests
    apiService["cache"].clear();
  });

  afterEach(() => {
    // Clean up after each test
    apiService["cache"].clear();
  });

  describe("apiService.feeds.createBatch", () => {
    it("should successfully parse multiple feeds in a single request", async () => {
      // Mock successful API response for two feeds
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            feeds: [
              {
                guid: "feed1",
                feedUrl: "https://valid1.com/feed.xml",
                feedTitle: "Valid Feed 1",
                siteTitle: "Valid Site 1",
                type: "feed",
                status: "active",
                description: "Test feed 1",
                link: "https://valid1.com",
                lastUpdated: "2025-01-01T00:00:00Z",
                lastRefreshed: "2025-01-01T00:00:00Z",
                published: "2025-01-01T00:00:00Z",
                author: null,
                language: "en",
                favicon: "",
                categories: [],
                items: [],
              },
              {
                guid: "feed2",
                feedUrl: "https://valid2.com/feed.xml",
                feedTitle: "Valid Feed 2",
                siteTitle: "Valid Site 2",
                type: "feed",
                status: "active",
                description: "Test feed 2",
                link: "https://valid2.com",
                lastUpdated: "2025-01-01T00:00:00Z",
                lastRefreshed: "2025-01-01T00:00:00Z",
                published: "2025-01-01T00:00:00Z",
                author: null,
                language: "en",
                favicon: "",
                categories: [],
                items: [],
              },
            ],
          }),
      });

      const batchDto: CreateBatchDto = {
        urls: ["https://valid1.com/feed.xml", "https://valid2.com/feed.xml"],
      };

      const result = await apiService.feeds.createBatch(batchDto);

      // Verify single API call was made
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/parse"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ urls: batchDto.urls }),
        }),
      );

      // Verify response structure
      expect(result).toEqual({
        feeds: expect.arrayContaining([
          expect.objectContaining({
            guid: "feed1",
            feedUrl: "https://valid1.com/feed.xml",
          }),
          expect.objectContaining({
            guid: "feed2",
            feedUrl: "https://valid2.com/feed.xml",
          }),
        ]),
        items: expect.any(Array),
        successfulCount: 2,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      });
    });

    it("should handle partial failures in batch parsing", async () => {
      // Mock response with only one successful feed
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            feeds: [
              {
                guid: "feed1",
                feedUrl: "https://valid1.com/feed.xml",
                feedTitle: "Valid Feed 1",
                siteTitle: "Valid Site 1",
                type: "feed",
                status: "active",
                description: "Test feed 1",
                link: "https://valid1.com",
                lastUpdated: "2025-01-01T00:00:00Z",
                lastRefreshed: "2025-01-01T00:00:00Z",
                published: "2025-01-01T00:00:00Z",
                author: null,
                language: "en",
                favicon: "",
                categories: [],
                items: [],
              },
            ],
          }),
      });

      const batchDto: CreateBatchDto = {
        urls: ["https://valid1.com/feed.xml", "https://invalid2.com/feed.xml"],
      };

      const result = await apiService.feeds.createBatch(batchDto);

      expect(result.successfulCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedUrls).toContain("https://invalid2.com/feed.xml");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        url: "https://invalid2.com/feed.xml",
        error: "Feed could not be parsed or fetched",
      });
    });

    it("should handle complete batch failure gracefully", async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const batchDto: CreateBatchDto = {
        urls: ["https://valid1.com/feed.xml", "https://valid2.com/feed.xml"],
      };

      const result = await apiService.feeds.createBatch(batchDto);

      // Should not throw, but return error information
      expect(result.successfulCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.failedUrls).toEqual(batchDto.urls);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((e) => e.error === "Network error")).toBe(
        true,
      );
    });

    it("should handle empty URL array", async () => {
      const batchDto: CreateBatchDto = { urls: [] };

      const result = await apiService.feeds.createBatch(batchDto);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        feeds: [],
        items: [],
        successfulCount: 0,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      });
    });

    it("should log batch operations for debugging", async () => {
      const batchDto: CreateBatchDto = {
        urls: ["https://valid1.com/feed.xml", "https://valid2.com/feed.xml"],
      };

      await apiService.feeds.createBatch(batchDto);

      expect(Logger.debug).toHaveBeenCalledWith(
        "[ApiService] Creating batch of 2 feeds",
      );
      expect(Logger.debug).toHaveBeenCalledWith(
        "[ApiService] Batch create completed: 2 successful, 0 failed",
      );
    });
  });

  describe("Single feed creation using batch parsing", () => {
    it("should use batch parsing for single feed creation", async () => {
      // Mock response with only one feed for single URL request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            feeds: [
              {
                guid: "feed1",
                feedUrl: "https://valid1.com/feed.xml",
                feedTitle: "Valid Feed 1",
                siteTitle: "Valid Site 1",
                type: "feed",
                status: "active",
                description: "Test feed 1",
                link: "https://valid1.com",
                lastUpdated: "2025-01-01T00:00:00Z",
                lastRefreshed: "2025-01-01T00:00:00Z",
                published: "2025-01-01T00:00:00Z",
                author: null,
                language: "en",
                favicon: "",
                categories: [],
                items: [],
              },
            ],
          }),
      });

      const result = await apiService.feeds.createBatch({
        urls: ["https://valid1.com/feed.xml"],
      });

      // Verify single API call was made
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/parse"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ urls: ["https://valid1.com/feed.xml"] }),
        }),
      );

      expect(result.successfulCount).toBe(1);
      expect(result.feeds).toHaveLength(1);
    });
  });
});
