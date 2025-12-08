// ABOUTME: Unit tests for the feedsKeys query key factory
// ABOUTME: Tests query key generation and stability for React Query cache management

import { feedsKeys } from "../feedsKeys";
import { stableKey } from "@/utils/hash";

// Mock the stableKey utility
jest.mock("@/utils/hash");
const mockedStableKey = stableKey as jest.MockedFunction<typeof stableKey>;

describe("feedsKeys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("all", () => {
    it("should return base feeds query key", () => {
      const result = feedsKeys.all;
      expect(result).toEqual(["feeds"]);
    });

    it("should be readonly tuple", () => {
      const result = feedsKeys.all;
      // TypeScript should ensure this is readonly, but we can test runtime behavior
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe("feeds");
    });
  });

  describe("list", () => {
    it("should generate list query key with stable hash of URLs", () => {
      const urls = ["https://example.com/feed1.xml", "https://example.com/feed2.xml"];
      const mockHash = "stable-hash-123";

      mockedStableKey.mockReturnValue(mockHash);

      const result = feedsKeys.list(urls);

      expect(mockedStableKey).toHaveBeenCalledWith(urls);
      expect(result).toEqual(["feeds", "list", mockHash]);
    });

    it("should handle empty URL array", () => {
      const urls: string[] = [];
      const mockHash = "";

      mockedStableKey.mockReturnValue(mockHash);

      const result = feedsKeys.list(urls);

      expect(mockedStableKey).toHaveBeenCalledWith(urls);
      expect(result).toEqual(["feeds", "list", mockHash]);
    });

    it("should handle single URL", () => {
      const urls = ["https://example.com/feed.xml"];
      const mockHash = "single-feed-hash";

      mockedStableKey.mockReturnValue(mockHash);

      const result = feedsKeys.list(urls);

      expect(mockedStableKey).toHaveBeenCalledWith(urls);
      expect(result).toEqual(["feeds", "list", mockHash]);
    });

    it("should generate consistent keys for same URL sets", () => {
      const urls1 = ["https://example.com/feed1.xml", "https://example.com/feed2.xml"];
      const urls2 = ["https://example.com/feed1.xml", "https://example.com/feed2.xml"];
      const mockHash = "consistent-hash";

      mockedStableKey.mockReturnValue(mockHash);

      const result1 = feedsKeys.list(urls1);
      const result2 = feedsKeys.list(urls2);

      expect(result1).toEqual(result2);
      expect(mockedStableKey).toHaveBeenCalledTimes(2);
      expect(mockedStableKey).toHaveBeenNthCalledWith(1, urls1);
      expect(mockedStableKey).toHaveBeenNthCalledWith(2, urls2);
    });

    it("should handle different URL orders through stable key", () => {
      const urls1 = ["https://example.com/feed1.xml", "https://example.com/feed2.xml"];
      const urls2 = ["https://example.com/feed2.xml", "https://example.com/feed1.xml"];

      // stableKey should normalize order, so both should produce same result
      mockedStableKey.mockReturnValue("normalized-hash");

      const result1 = feedsKeys.list(urls1);
      const result2 = feedsKeys.list(urls2);

      // Both should have same structure since stableKey normalizes
      expect(result1).toEqual(["feeds", "list", "normalized-hash"]);
      expect(result2).toEqual(["feeds", "list", "normalized-hash"]);
    });
  });

  describe("details", () => {
    it("should generate details query key with feed ID", () => {
      const feedId = "feed-123";
      const result = feedsKeys.details(feedId);

      expect(result).toEqual(["feeds", "detail", feedId]);
    });

    it("should handle empty string ID", () => {
      const feedId = "";
      const result = feedsKeys.details(feedId);

      expect(result).toEqual(["feeds", "detail", ""]);
    });

    it("should handle URL as ID", () => {
      const feedId = "https://example.com/feed.xml";
      const result = feedsKeys.details(feedId);

      expect(result).toEqual(["feeds", "detail", feedId]);
    });

    it("should generate different keys for different IDs", () => {
      const result1 = feedsKeys.details("feed-1");
      const result2 = feedsKeys.details("feed-2");

      expect(result1).not.toEqual(result2);
      expect(result1).toEqual(["feeds", "detail", "feed-1"]);
      expect(result2).toEqual(["feeds", "detail", "feed-2"]);
    });
  });

  describe("integration", () => {
    it("should create hierarchical query key structure", () => {
      const urls = ["https://example.com/feed.xml"];
      const mockHash = "test-hash";

      mockedStableKey.mockReturnValue(mockHash);

      const all = feedsKeys.all;
      const list = feedsKeys.list(urls);
      const detail = feedsKeys.details("feed-123");

      // All keys should start with 'feeds'
      expect(all[0]).toBe("feeds");
      expect(list[0]).toBe("feeds");
      expect(detail[0]).toBe("feeds");

      // Should have proper hierarchy
      expect(list[1]).toBe("list");
      expect(detail[1]).toBe("detail");

      // Should be properly typed as query keys
      expect(Array.isArray(all)).toBe(true);
      expect(Array.isArray(list)).toBe(true);
      expect(Array.isArray(detail)).toBe(true);
    });

    it("should work with React Query invalidation patterns", () => {
      const urls = ["https://example.com/feed.xml"];
      mockedStableKey.mockReturnValue("test-hash");

      // These are typical patterns used with queryClient.invalidateQueries()
      const allKey = feedsKeys.all; // Would invalidate all feeds queries
      const listKey = feedsKeys.list(urls); // Would invalidate specific list
      const detailKey = feedsKeys.details("feed-1"); // Would invalidate specific detail

      expect(allKey).toEqual(["feeds"]);
      expect(listKey).toEqual(["feeds", "list", "test-hash"]);
      expect(detailKey).toEqual(["feeds", "detail", "feed-1"]);
    });
  });
});
