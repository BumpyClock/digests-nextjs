/**
 * Tests for WorkerService
 * Tests worker management, RSS parsing, and feed processing
 */

import { workerService } from "../worker-service";
import { Feed, FeedItem } from "@/types";

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(data: { type?: string; url?: string; [key: string]: unknown }) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(
          new MessageEvent("message", {
            data: {
              type: "PARSE_COMPLETE",
              feeds: [
                {
                  id: "1",
                  title: "Test Feed",
                  url: "https://example.com/feed",
                  site_url: "https://example.com",
                  description: "Test description",
                  last_fetched: new Date().toISOString(),
                  category: "test",
                  added_at: new Date().toISOString(),
                },
              ],
              items: [
                {
                  id: "1",
                  feed_id: "1",
                  title: "Test Item",
                  url: "https://example.com/item",
                  content_html: "<p>Test content</p>",
                  published_at: new Date().toISOString(),
                },
              ],
            },
          }),
        );
      }
    }, 10);
  }

  terminate() {
    // Mock terminate
  }
}

// Mock Worker constructor
(global as { Worker: typeof MockWorker }).Worker = MockWorker;

describe("WorkerService", () => {
  beforeEach(() => {
    // workerService is imported as a singleton instance
  });

  afterEach(() => {
    workerService.terminate();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      expect(workerService).toBeDefined();
      expect(typeof workerService.parseRSS).toBe("function");
    });
  });

  describe("RSS Parsing", () => {
    it("should parse RSS feeds", async () => {
      const xmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Blog</title>
            <link>https://example.com</link>
            <description>A test blog</description>
            <item>
              <title>Test Post</title>
              <link>https://example.com/post</link>
              <description>Test post content</description>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `;

      const result = await workerService.parseRSS(
        xmlContent,
        "https://example.com/feed",
      );

      expect(result.feeds).toHaveLength(1);
      expect(result.feeds[0].feedTitle).toBe("Test Feed");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Test Item");
    });

    it("should handle Atom feeds", async () => {
      const atomContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test Atom Feed</title>
          <link href="https://example.com"/>
          <updated>2024-01-01T00:00:00Z</updated>
          <entry>
            <title>Atom Entry</title>
            <link href="https://example.com/entry"/>
            <updated>2024-01-01T00:00:00Z</updated>
            <content type="html">Entry content</content>
          </entry>
        </feed>
      `;

      const result = await workerService.parseRSS(
        atomContent,
        "https://example.com/atom",
      );

      expect(result.feeds).toHaveLength(1);
      expect(result.items).toHaveLength(1);
    });

    it("should handle podcast feeds", async () => {
      const podcastXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
          <channel>
            <title>Test Podcast</title>
            <link>https://example.com/podcast</link>
            <itunes:author>Podcast Host</itunes:author>
            <item>
              <title>Episode 1</title>
              <enclosure url="https://example.com/episode1.mp3" type="audio/mpeg" length="10000000"/>
              <itunes:duration>30:00</itunes:duration>
            </item>
          </channel>
        </rss>
      `;

      const result = await workerService.parseRSS(
        podcastXml,
        "https://example.com/podcast",
      );

      expect(result.feeds[0].category).toBe("podcast");
      expect(result.items[0].attachments).toBeDefined();
      expect(result.items[0].attachments![0].mime_type).toBe("audio/mpeg");
    });

    it("should handle parsing errors", async () => {
      const invalidXml = "not valid xml";

      await expect(
        workerService.parseRSS(invalidXml, "https://example.com/invalid"),
      ).rejects.toThrow();
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple URLs", async () => {
      const urls = [
        "https://example.com/feed1",
        "https://example.com/feed2",
        "https://example.com/feed3",
      ];

      const results = await workerService.processFeedBatch(urls);

      expect(results).toHaveLength(3);
      results.forEach((result: { feeds: unknown; items: unknown; error?: unknown }) => {
        expect(result.feeds).toBeDefined();
        expect(result.items).toBeDefined();
      });
    });

    it("should handle partial failures", async () => {
      // Mock worker to fail on second URL
      const mockWorker = new MockWorker();
      mockWorker.postMessage = jest.fn((data: { url?: string }) => {
        setTimeout(() => {
          if (data.url === "https://example.com/fail") {
            if (mockWorker.onerror) {
              mockWorker.onerror(
                new ErrorEvent("error", {
                  message: "Parsing failed",
                }),
              );
            }
          } else {
            if (mockWorker.onmessage) {
              mockWorker.onmessage(
                new MessageEvent("message", {
                  data: {
                    type: "PARSE_COMPLETE",
                    feeds: [],
                    items: [],
                  },
                }),
              );
            }
          }
        }, 10);
      });

      (global as { Worker: jest.MockedFunction<() => MockWorker> }).Worker = jest.fn(() => mockWorker);

      const urls = [
        "https://example.com/feed1",
        "https://example.com/fail",
        "https://example.com/feed3",
      ];

      const results = await workerService.processFeedBatch(urls);

      // Should still return results for successful URLs
      expect(results.filter((r: { error?: unknown }) => r.error === undefined)).toHaveLength(2);
      expect(results.filter((r: { error?: unknown }) => r.error !== undefined)).toHaveLength(1);
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests efficiently", async () => {
      const startTime = Date.now();

      // Process 10 feeds concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        workerService.parseRSS("<rss></rss>", `https://example.com/feed${i}`),
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should process concurrently (not take 10x single request time)
      expect(duration).toBeLessThan(1000);
    });

    it("should clean up workers after use", async () => {
      const terminateSpy = jest.spyOn(MockWorker.prototype, "terminate");

      await workerService.parseRSS("<rss></rss>", "https://example.com/feed");
      workerService.terminate();

      expect(terminateSpy).toHaveBeenCalled();
    });
  });

  describe("Content Extraction", () => {
    it("should extract full content when available", async () => {
      const xmlWithContent = `
        <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel>
            <item>
              <title>Full Content Post</title>
              <description>Short description</description>
              <content:encoded><![CDATA[<p>Full HTML content with <strong>formatting</strong></p>]]></content:encoded>
            </item>
          </channel>
        </rss>
      `;

      const result = await workerService.parseRSS(
        xmlWithContent,
        "https://example.com/feed",
      );

      expect(result.items[0].content_html).toContain("Full HTML content");
      expect(result.items[0].content_html).toContain(
        "<strong>formatting</strong>",
      );
    });

    it("should fallback to description if no content", async () => {
      const xmlWithDescription = `
        <rss version="2.0">
          <channel>
            <item>
              <title>Description Only</title>
              <description>This is the description</description>
            </item>
          </channel>
        </rss>
      `;

      const result = await workerService.parseRSS(
        xmlWithDescription,
        "https://example.com/feed",
      );

      expect(result.items[0].content_html).toBe("This is the description");
    });
  });

  describe("Feed Metadata", () => {
    it("should extract feed metadata", async () => {
      const xmlWithMetadata = `
        <rss version="2.0">
          <channel>
            <title>Tech Blog</title>
            <link>https://techblog.com</link>
            <description>Latest tech news</description>
            <language>en-US</language>
            <lastBuildDate>Mon, 01 Jan 2024 00:00:00 GMT</lastBuildDate>
            <image>
              <url>https://techblog.com/logo.png</url>
            </image>
          </channel>
        </rss>
      `;

      const result = await workerService.parseRSS(
        xmlWithMetadata,
        "https://techblog.com/feed",
      );

      const feed = result.feeds[0];
      expect(feed.feedTitle).toBe("Tech Blog");
      expect(feed.link).toBe("https://techblog.com");
      expect(feed.description).toBe("Latest tech news");
      expect(feed.language).toBe("en-US");
      // Note: favicon/image would be in feed.favicon property
    });
  });

  describe("Error Handling", () => {
    it("should timeout long-running operations", async () => {
      // Mock worker that never responds
      const slowWorker = new MockWorker();
      slowWorker.postMessage = jest.fn();
      (global as { Worker: jest.MockedFunction<() => MockWorker> }).Worker = jest.fn(() => slowWorker);

      await expect(
        workerService.parseRSS("<rss></rss>", "https://example.com/slow", {
          timeout: 100,
        }),
      ).rejects.toThrow(/timeout/i);
    });

    it("should handle worker crashes", async () => {
      const crashingWorker = new MockWorker();
      crashingWorker.postMessage = jest.fn(() => {
        setTimeout(() => {
          if (crashingWorker.onerror) {
            crashingWorker.onerror(
              new ErrorEvent("error", {
                message: "Worker crashed",
              }),
            );
          }
        }, 10);
      });

      (global as { Worker: jest.MockedFunction<() => MockWorker> }).Worker = jest.fn(() => crashingWorker);

      await expect(
        workerService.parseRSS("<rss></rss>", "https://example.com/crash"),
      ).rejects.toThrow(/Worker crashed/);
    });
  });
});
