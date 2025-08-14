/**
 * Security tests for API service
 * Tests cache key collision fix and URL validation
 */

import crypto from "crypto";
import { apiService } from "../api-service";

describe("ApiService Security Tests", () => {
  describe("Cache Key Generation", () => {
    it("should generate SHA-256 hashed cache keys for feed URLs", async () => {
      const urls = ["https://example.com/feed1", "https://example.com/feed2"];
      const sortedUrls = urls.sort().join(",");
      // The implementation hashes "feeds:" + sortedUrls together
      const expectedHash = crypto
        .createHash("sha256")
        .update(`feeds:${sortedUrls}`)
        .digest("hex");
      const expectedCacheKey = expectedHash;

      // We'll need to spy on the cache.get method to capture the cache key
      const cacheGetSpy = jest.spyOn((apiService as { cache: { get: jest.Mock } }).cache, "get");

      // Mock the fetch to prevent actual API calls
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [] }),
      });

      try {
        await apiService.fetchFeeds(urls);
      } catch (error) {
        // Expected to fail since we're mocking
      }

      expect(cacheGetSpy).toHaveBeenCalledWith(expectedCacheKey);
    });

    it("should handle extremely long URL lists without truncation", async () => {
      // Create 100 URLs that would exceed typical string limits
      const urls = Array.from(
        { length: 100 },
        (_, i) =>
          `https://example.com/very-long-feed-url-${i}-with-lots-of-parameters?param1=value1&param2=value2&param3=value3`,
      );

      const sortedUrls = urls.sort().join(",");
      // The implementation hashes "feeds:" + sortedUrls together
      const expectedHash = crypto
        .createHash("sha256")
        .update(`feeds:${sortedUrls}`)
        .digest("hex");
      const expectedCacheKey = expectedHash;

      const cacheGetSpy = jest.spyOn((apiService as { cache: { get: jest.Mock } }).cache, "get");

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [] }),
      });

      try {
        await apiService.fetchFeeds(urls);
      } catch (error) {
        // Expected to fail since we're mocking
      }

      expect(cacheGetSpy).toHaveBeenCalledWith(expectedCacheKey);
      // SHA-256 always produces 64 character hex string
      expect(expectedCacheKey.length).toBe(64); // 64 char hash
    });

    it("should generate consistent cache keys for same URLs in different order", async () => {
      const urls1 = ["https://b.com", "https://a.com", "https://c.com"];
      const urls2 = ["https://c.com", "https://a.com", "https://b.com"];

      const sortedUrls = [...urls1].sort().join(",");
      const expectedHash = crypto
        .createHash("sha256")
        .update(sortedUrls)
        .digest("hex");
      const expectedCacheKey = `feeds:${expectedHash}`;

      const cacheGetSpy = jest.spyOn((apiService as { cache: { get: jest.Mock } }).cache, "get");
      cacheGetSpy.mockClear(); // Clear any previous calls

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ feeds: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ feeds: [] }) });

      await apiService.fetchFeeds(urls1).catch(() => {});
      await apiService.fetchFeeds(urls2).catch(() => {});

      // Both calls should use the same cache key
      expect(cacheGetSpy).toHaveBeenCalledWith(expectedCacheKey);
      expect(cacheGetSpy).toHaveBeenCalledTimes(2);

      // Verify both calls used the same key
      const calls = cacheGetSpy.mock.calls;
      expect(calls[0][0]).toBe(expectedCacheKey);
      expect(calls[1][0]).toBe(expectedCacheKey);
    });
  });

  describe("URL Validation", () => {
    it("should accept valid HTTP URLs", () => {
      expect(() =>
        apiService.updateApiUrl("http://localhost:3000"),
      ).not.toThrow();
      expect(() =>
        apiService.updateApiUrl("https://api.example.com"),
      ).not.toThrow();
    });

    it("should reject invalid URLs", () => {
      expect(() => apiService.updateApiUrl("not-a-url")).toThrow(
        "Invalid API URL",
      );
      expect(() => apiService.updateApiUrl("")).toThrow("Invalid API URL");
      expect(() => apiService.updateApiUrl("javascript:alert(1)")).toThrow(
        "Invalid protocol",
      );
      expect(() => apiService.updateApiUrl("file:///etc/passwd")).toThrow(
        "Invalid protocol",
      );
      expect(() => apiService.updateApiUrl("ftp://example.com")).toThrow(
        "Invalid protocol",
      );
    });

    it("should clear cache when URL is updated", () => {
      const cacheClearSpy = jest.spyOn((apiService as { cache: { clear: jest.Mock } }).cache, "clear");

      apiService.updateApiUrl("https://new-api.example.com");

      expect(cacheClearSpy).toHaveBeenCalled();
    });

    it("should validate URLs and store them as-is when valid", () => {
      // Test that valid URLs are accepted and stored correctly
      const testCases = [
        "https://example.com/",
        "https://api.example.com/v1/endpoint",
        "http://localhost:3000/api",
        "https://example.com:8080/path",
        "https://subdomain.example.com/path/to/resource",
      ];

      testCases.forEach((url) => {
        expect(() => apiService.updateApiUrl(url)).not.toThrow();
        expect((apiService as { baseUrl: string }).baseUrl).toBe(url);
      });

      // URLs with potentially dangerous content are still valid URLs
      // The URL constructor will parse them correctly
      const urlsWithSpecialChars = [
        "https://example.com/path<script>alert(1)</script>",
        "https://example.com?param=value&xss=<script>alert(1)</script>",
      ];

      urlsWithSpecialChars.forEach((url) => {
        expect(() => apiService.updateApiUrl(url)).not.toThrow();
        // URLs are stored as provided - sanitization happens at render time
        expect((apiService as { baseUrl: string }).baseUrl).toBe(url);
      });
    });
  });

  describe("Reader View Cache Keys", () => {
    it("should use SHA-256 for reader view cache keys", async () => {
      const url = "https://example.com/article";
      const expectedHash = crypto
        .createHash("sha256")
        .update(url)
        .digest("hex");
      const expectedCacheKey = `reader:${expectedHash}`;

      const cacheGetSpy = jest.spyOn((apiService as { cache: { get: jest.Mock } }).cache, "get");

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      try {
        await apiService.fetchReaderView(url);
      } catch (error) {
        // Expected to fail since we're mocking
      }

      expect(cacheGetSpy).toHaveBeenCalledWith(expectedCacheKey);
    });
  });
});
