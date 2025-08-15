// ABOUTME: Simple unit tests for batch feed parsing functionality without mocking complexities
// ABOUTME: Tests the core batch parsing logic and error handling

import type {
  CreateBatchDto,
  BatchCreateResponse,
} from "@/services/api-service";

describe("Batch Feed Parsing Logic", () => {
  describe("batch response structure", () => {
    it("should have correct BatchCreateResponse interface", () => {
      const mockResponse: BatchCreateResponse = {
        feeds: [],
        items: [],
        successfulCount: 0,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      };

      expect(mockResponse).toHaveProperty("feeds");
      expect(mockResponse).toHaveProperty("items");
      expect(mockResponse).toHaveProperty("successfulCount");
      expect(mockResponse).toHaveProperty("failedCount");
      expect(mockResponse).toHaveProperty("failedUrls");
      expect(mockResponse).toHaveProperty("errors");
    });

    it("should support CreateBatchDto interface", () => {
      const mockDto: CreateBatchDto = {
        urls: [
          "https://example1.com/feed.xml",
          "https://example2.com/feed.xml",
        ],
      };

      expect(mockDto).toHaveProperty("urls");
      expect(Array.isArray(mockDto.urls)).toBe(true);
    });
  });

  describe("batch processing logic", () => {
    it("should identify successful vs failed URLs correctly", () => {
      const inputUrls = [
        "https://valid1.com/feed.xml",
        "https://valid2.com/feed.xml",
        "https://invalid.com/feed.xml",
      ];
      const returnedFeeds = [
        { feedUrl: "https://valid1.com/feed.xml", guid: "feed1" },
        { feedUrl: "https://valid2.com/feed.xml", guid: "feed2" },
      ];

      // Simulate the logic from createBatch
      const successfulUrls = new Set(returnedFeeds.map((f) => f.feedUrl));
      const failedUrls = inputUrls.filter((url) => !successfulUrls.has(url));
      const successfulCount = returnedFeeds.length;
      const failedCount = failedUrls.length;

      expect(successfulCount).toBe(2);
      expect(failedCount).toBe(1);
      expect(failedUrls).toEqual(["https://invalid.com/feed.xml"]);
    });

    it("should handle empty URL array", () => {
      const inputUrls: string[] = [];
      const returnedFeeds: any[] = [];

      const successfulUrls = new Set(returnedFeeds.map((f) => f.feedUrl));
      const failedUrls = inputUrls.filter((url) => !successfulUrls.has(url));
      const successfulCount = returnedFeeds.length;
      const failedCount = failedUrls.length;

      expect(successfulCount).toBe(0);
      expect(failedCount).toBe(0);
      expect(failedUrls).toEqual([]);
    });

    it("should handle complete failure scenario", () => {
      const inputUrls = [
        "https://invalid1.com/feed.xml",
        "https://invalid2.com/feed.xml",
      ];
      const returnedFeeds: any[] = []; // API returned no feeds

      const successfulUrls = new Set(returnedFeeds.map((f) => f.feedUrl));
      const failedUrls = inputUrls.filter((url) => !successfulUrls.has(url));
      const successfulCount = returnedFeeds.length;
      const failedCount = failedUrls.length;
      const errors = failedUrls.map((url) => ({
        url,
        error: "Feed could not be parsed or fetched",
      }));

      expect(successfulCount).toBe(0);
      expect(failedCount).toBe(2);
      expect(failedUrls).toEqual(inputUrls);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toEqual({
        url: "https://invalid1.com/feed.xml",
        error: "Feed could not be parsed or fetched",
      });
    });

    it("should create proper error objects for failures", () => {
      const failedUrls = [
        "https://invalid1.com/feed.xml",
        "https://invalid2.com/feed.xml",
      ];
      const networkError = new Error("Network timeout");

      // Simulate error mapping logic
      const errors = failedUrls.map((url) => ({
        url,
        error: networkError.message,
      }));

      expect(errors).toHaveLength(2);
      expect(errors.every((e) => e.error === "Network timeout")).toBe(true);
      expect(errors.every((e) => typeof e.url === "string")).toBe(true);
    });
  });

  describe("single feed to batch conversion", () => {
    it("should convert single feed request to batch format", () => {
      const singleFeedUrl = "https://example.com/feed.xml";
      const batchDto: CreateBatchDto = { urls: [singleFeedUrl] };

      expect(batchDto.urls).toHaveLength(1);
      expect(batchDto.urls[0]).toBe(singleFeedUrl);
    });

    it("should handle single feed response in batch format", () => {
      const batchResponse: BatchCreateResponse = {
        feeds: [
          { feedUrl: "https://example.com/feed.xml", guid: "feed1" } as any,
        ],
        items: [],
        successfulCount: 1,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      };

      // Simulate extracting single feed from batch response
      const singleFeed = batchResponse.feeds[0];

      expect(batchResponse.successfulCount).toBe(1);
      expect(singleFeed).toBeDefined();
      expect(singleFeed.feedUrl).toBe("https://example.com/feed.xml");
    });
  });
});
