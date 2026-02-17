// ABOUTME: Unit tests for shared query-key + URL normalization helpers
// ABOUTME: Tests feed query-key composition stability and reader query key normalization

import { stableKey } from "@/utils/hash";
import {
  feedsKeys,
  getSubscriptionUrls,
  normalizeFeedUrl,
  normalizeFeedUrls,
  readerViewKeys,
} from "../feedsKeys";

describe("feedsKeys", () => {
  describe("all", () => {
    it("should return base feeds query key", () => {
      const result = feedsKeys.all;
      expect(result).toEqual(["feeds"]);
    });
  });

  describe("list", () => {
    it("should normalize feed URLs before composing key", () => {
      const urls = [" HTTPS://Example.COM/Feed.xml/", "https://example.com/feed.xml"];

      const result = feedsKeys.list(urls);

      expect(result[0]).toBe("feeds");
      expect(result[1]).toBe("list");
      expect(result[2]).toBe(stableKey(urls));
    });

    it("should deduplicate normalized feed URLs", () => {
      const urls = ["https://example.com/feed.xml", "https://example.com/feed.xml/"];
      const result = feedsKeys.list(urls);

      expect(result).toEqual(["feeds", "list", stableKey(["https://example.com/feed.xml"])]);
    });

    it("should keep key stable for URL order changes", () => {
      const urls1 = ["https://example.com/feed-b.xml", "https://example.com/feed-a.xml"];
      const urls2 = ["https://example.com/feed-a.xml", "https://example.com/feed-b.xml"];

      expect(feedsKeys.list(urls1)).toEqual(feedsKeys.list(urls2));
    });

    it("should produce deterministic key for empty feed list", () => {
      const result = feedsKeys.list([]);
      expect(result).toEqual(["feeds", "list", stableKey([])]);
    });
  });

  describe("details", () => {
    it("should preserve details key shape", () => {
      expect(feedsKeys.details("feed-1")).toEqual(["feeds", "detail", "feed-1"]);
    });
  });

  it("should detect list query keys", () => {
    expect(feedsKeys.isList(feedsKeys.list(["https://example.com/feed.xml"]))).toBe(true);
    expect(feedsKeys.isList(feedsKeys.details("feed-1"))).toBe(false);
    expect(feedsKeys.isList(["feeds", "detail", "feed-1"])).toBe(false);
  });

  describe("subscription url helpers", () => {
    it("should normalize urls", () => {
      expect(normalizeFeedUrl(" HTTPS://Example.COM/Feed.xml/ ")).toBe("example.com/feed.xml");
    });

    it("should dedupe and sort normalized urls", () => {
      const urls = [
        "https://example.com/z.xml",
        " https://example.com/a.xml ",
        "https://example.com/z.xml",
      ];
      expect(normalizeFeedUrls(urls)).toEqual(["example.com/a.xml", "example.com/z.xml"]);
    });

    it("should extract normalized urls from subscription objects", () => {
      const subscriptions = [
        { feedUrl: "https://example.com/z.xml" },
        { feedUrl: " https://example.com/a.xml " },
        { feedUrl: "https://example.com/z.xml" },
        { feedUrl: "" },
        { feedUrl: undefined },
      ];

      expect(getSubscriptionUrls(subscriptions)).toEqual([
        "example.com/a.xml",
        "example.com/z.xml",
      ]);
    });
  });

  describe("readerViewKeys", () => {
    it("should normalize reader view keys", () => {
      expect(readerViewKeys.byUrl("HTTP://Example.COM/Article/")).toEqual([
        "readerView",
        "example.com/article",
      ]);
    });

    it("should keep reader all key", () => {
      expect(readerViewKeys.all).toEqual(["readerView"]);
    });
  });
});
