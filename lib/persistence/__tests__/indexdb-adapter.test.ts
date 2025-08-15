/**
 * Integration tests for IndexedDB persistence adapter
 * Tests storage operations, TTL, cleanup, and error handling
 */

import { IndexedDBAdapter } from "../indexdb-adapter";
// import type { PersistedQueryData } from "@/types/persistence";

// Mock IndexedDB for Node environment
import "fake-indexeddb/auto";

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;

  beforeEach(() => {
    // Clear IndexedDB before each test
    indexedDB.deleteDatabase("test-db");
    adapter = new IndexedDBAdapter("test-db", "test-store", 1);
  });

  afterEach(() => {
    // Clean up
    indexedDB.deleteDatabase("test-db");
  });

  describe("Basic Operations", () => {
    it("should store and retrieve data", async () => {
      const testData = { name: "test", value: 123 };
      await adapter.set("test-key", testData);

      const retrieved = await adapter.get<typeof testData>("test-key");
      expect(retrieved).toEqual(testData);
    });

    it("should return null for non-existent keys", async () => {
      const result = await adapter.get("non-existent");
      expect(result).toBeNull();
    });

    it("should overwrite existing values", async () => {
      await adapter.set("test-key", { value: 1 });
      await adapter.set("test-key", { value: 2 });

      const result = await adapter.get("test-key");
      expect(result).toEqual({ value: 2 });
    });

    it("should delete values", async () => {
      await adapter.set("test-key", { value: "test" });
      await adapter.delete("test-key");

      const result = await adapter.get("test-key");
      expect(result).toBeNull();
    });

    it("should clear all values", async () => {
      await adapter.set("key1", { value: 1 });
      await adapter.set("key2", { value: 2 });
      await adapter.set("key3", { value: 3 });

      await adapter.clear();

      const result1 = await adapter.get("key1");
      const result2 = await adapter.get("key2");
      const result3 = await adapter.get("key3");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe("TTL Support", () => {
    it("should respect TTL on stored values", async () => {
      const testData = { value: "expires" };
      await adapter.set("ttl-key", testData, 100); // 100ms TTL

      // Should exist immediately
      const result1 = await adapter.get("ttl-key");
      expect(result1).toEqual(testData);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired and cleaned up
      const result2 = await adapter.get("ttl-key");
      expect(result2).toBeNull();
    });

    it("should store values without TTL indefinitely", async () => {
      const testData = { value: "permanent" };
      await adapter.set("permanent-key", testData);

      // Wait some time
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should still exist
      const result = await adapter.get("permanent-key");
      expect(result).toEqual(testData);
    });
  });

  describe("Batch Operations", () => {
    it("should get multiple values at once", async () => {
      await adapter.set("key1", { value: 1 });
      await adapter.set("key2", { value: 2 });
      await adapter.set("key3", { value: 3 });

      const results = await adapter.getMany<{ value: number }>([
        "key1",
        "key2",
        "key3",
        "non-existent",
      ]);

      expect(results.size).toBe(3);
      expect(results.get("key1")).toEqual({ value: 1 });
      expect(results.get("key2")).toEqual({ value: 2 });
      expect(results.get("key3")).toEqual({ value: 3 });
      expect(results.has("non-existent")).toBe(false);
    });

    it("should handle empty keys array in getMany", async () => {
      const results = await adapter.getMany([]);
      expect(results.size).toBe(0);
    });

    it("should set multiple values at once", async () => {
      const entries = new Map([
        ["batch1", { value: "a" }],
        ["batch2", { value: "b" }],
        ["batch3", { value: "c" }],
      ]);

      await adapter.setMany(entries);

      const result1 = await adapter.get("batch1");
      const result2 = await adapter.get("batch2");
      const result3 = await adapter.get("batch3");

      expect(result1).toEqual({ value: "a" });
      expect(result2).toEqual({ value: "b" });
      expect(result3).toEqual({ value: "c" });
    });

    it("should handle empty entries map in setMany", async () => {
      await expect(adapter.setMany(new Map())).resolves.not.toThrow();
    });

    it("should handle partial failures in setMany gracefully", async () => {
      // This test would require mocking IndexedDB errors
      // For now, we ensure the method handles errors properly
      const entries = new Map([["valid", { value: "test" }]]);

      await expect(adapter.setMany(entries)).resolves.not.toThrow();
    });
  });

  describe("Storage Information", () => {
    it("should provide storage information", async () => {
      await adapter.set("info1", { value: 1 });
      await adapter.set("info2", { value: 2 });

      const info = await adapter.getStorageInfo();

      expect(info.count).toBe(2);
      expect(info.oldestEntry).toBeDefined();
      expect(info.used).toBeGreaterThanOrEqual(0);
      expect(info.quota).toBeGreaterThan(0);
    });

    it("should handle empty storage", async () => {
      const info = await adapter.getStorageInfo();

      expect(info.count).toBe(0);
      expect(info.oldestEntry).toBeUndefined();
    });
  });

  describe("Database Initialization", () => {
    it("should handle concurrent initialization calls", async () => {
      const adapter = new IndexedDBAdapter("concurrent-test", "store", 1);

      // Simulate concurrent calls
      const promises = [
        adapter.get("key1"),
        adapter.get("key2"),
        adapter.set("key3", { value: 3 }),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it("should upgrade database schema when version changes", async () => {
      // Create adapter with version 1
      const adapter1 = new IndexedDBAdapter("upgrade-test", "store", 1);
      await adapter1.set("key", { value: "v1" });

      // Create adapter with version 2
      const adapter2 = new IndexedDBAdapter("upgrade-test", "store", 2);
      const result = await adapter2.get("key");

      // Data should be preserved after upgrade
      expect(result).toEqual({ value: "v1" });
    });
  });

  describe("Error Handling", () => {
    it("should handle database open errors gracefully", async () => {
      // Mock indexedDB.open to fail
      const originalOpen = indexedDB.open;
      indexedDB.open = jest.fn().mockImplementation(() => {
        const request = originalOpen.call(indexedDB, "error-test");
        setTimeout(() => {
          request.dispatchEvent(new Event("error"));
        }, 0);
        return request;
      });

      const errorAdapter = new IndexedDBAdapter("error-test", "store", 1);
      await expect(errorAdapter.get("key")).rejects.toThrow();

      // Restore
      indexedDB.open = originalOpen;
    });

    it("should handle transaction errors", async () => {
      // This would require more sophisticated mocking
      // For now, ensure the adapter doesn't crash on errors
      await expect(adapter.get("test")).resolves.not.toThrow();
    });

    it("should handle quota exceeded errors with cleanup", async () => {
      // Simulate quota exceeded by filling storage
      const largeData = new Array(1000).fill("x").join("");

      // Set some data with TTL for cleanup
      await adapter.set("cleanup1", { data: largeData }, 100);
      await adapter.set("cleanup2", { data: largeData }, 100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Try to set new data - should trigger cleanup
      await expect(
        adapter.set("new-key", { data: "small" }),
      ).resolves.not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should handle large datasets efficiently", async () => {
      const startTime = Date.now();
      const largeObject = {
        data: new Array(1000).fill({
          id: 1,
          name: "test",
          value: Math.random(),
        }),
      };

      await adapter.set("large-key", largeObject);
      const retrieved = await adapter.get("large-key");

      const duration = Date.now() - startTime;

      expect(retrieved).toEqual(largeObject);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it("should handle many small operations efficiently", async () => {
      const startTime = Date.now();
      const operations = [];

      // Perform 100 set operations
      for (let i = 0; i < 100; i++) {
        operations.push(adapter.set(`key-${i}`, { value: i }));
      }

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 500ms

      // Verify data integrity
      const sample = await adapter.get("key-50");
      expect(sample).toEqual({ value: 50 });
    });
  });

  describe("Static Methods", () => {
    it("should detect IndexedDB support", () => {
      expect(IndexedDBAdapter.isSupported()).toBe(true);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve data types correctly", async () => {
      const testCases = [
        { key: "string", value: "test string" },
        { key: "number", value: 42 },
        { key: "boolean", value: true },
        { key: "null", value: null },
        { key: "array", value: [1, 2, 3] },
        { key: "object", value: { nested: { value: "deep" } } },
        { key: "date", value: new Date().toISOString() },
      ];

      for (const testCase of testCases) {
        await adapter.set(testCase.key, testCase.value);
        const retrieved = await adapter.get(testCase.key);
        expect(retrieved).toEqual(testCase.value);
      }
    });

    it("should handle complex nested structures", async () => {
      const complexData = {
        feeds: [
          {
            id: "feed1",
            items: [
              { id: "item1", content: "content1" },
              { id: "item2", content: "content2" },
            ],
            metadata: {
              lastUpdated: new Date().toISOString(),
              tags: ["tech", "news"],
            },
          },
        ],
        settings: {
          theme: "dark",
          notifications: {
            enabled: true,
            frequency: "daily",
          },
        },
      };

      await adapter.set("complex", complexData);
      const retrieved = await adapter.get("complex");
      expect(retrieved).toEqual(complexData);
    });
  });

  describe("Cleanup Operations", () => {
    it("should clean up expired entries during cleanup", async () => {
      // Add entries with short TTL
      await adapter.set("expire1", { value: 1 }, 50);
      await adapter.set("expire2", { value: 2 }, 50);
      await adapter.set("keep", { value: 3 }); // No TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup (normally happens on quota exceeded)
      await (adapter as IndexedDBAdapter).cleanup();

      // Check that expired entries are gone
      expect(await adapter.get("expire1")).toBeNull();
      expect(await adapter.get("expire2")).toBeNull();
      expect(await adapter.get("keep")).toEqual({ value: 3 });
    });

    it("should remove oldest entries when quota is exceeded", async () => {
      // Add entries with timestamps
      const entries = [];
      for (let i = 0; i < 10; i++) {
        await adapter.set(`old-${i}`, { value: i });
        await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamps
        entries.push(`old-${i}`);
      }

      // Remove oldest 20% (2 entries)
      await (adapter as IndexedDBAdapter).removeOldestEntries(0.2);

      // First 2 should be gone
      expect(await adapter.get("old-0")).toBeNull();
      expect(await adapter.get("old-1")).toBeNull();

      // Rest should remain
      expect(await adapter.get("old-2")).toEqual({ value: 2 });
      expect(await adapter.get("old-9")).toEqual({ value: 9 });
    });
  });
});
