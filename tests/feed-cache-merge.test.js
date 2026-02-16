import assert from "node:assert";
import test from "node:test";
import { mergeCacheData } from "../compiled-tests/hooks/queries/feed-cache-utils.js";

const baseData = {
  feeds: [
    { feedUrl: "https://a.example/rss", feedTitle: "Feed A" },
    { feedUrl: "https://b.example/rss", feedTitle: "Feed B" },
  ],
  items: [
    { id: "item-1", feedUrl: "https://a.example/rss", published: "2024-01-01T09:00:00Z" },
    { id: "item-2", feedUrl: "https://a.example/rss", published: "2024-01-01T08:00:00Z" },
  ],
};

test("merges incoming batch with existing cache without dropping prior data", () => {
  const merged = mergeCacheData(baseData, {
    feeds: [{ feedUrl: "https://b.example/rss", feedTitle: "Feed B Updated" }],
    items: [{ id: "item-3", feedUrl: "https://c.example/rss", published: "2024-01-01T10:00:00Z" }],
  });

  assert.equal(merged.feeds.length, 2);
  const updatedFeed = merged.feeds.find((feed) => feed.feedUrl === "https://b.example/rss");
  assert.ok(updatedFeed);
  assert.equal(updatedFeed.feedTitle, "Feed B Updated");
  assert.equal(merged.items.length, 3);
  const newItem = merged.items.find((item) => item.id === "item-3");
  assert.ok(newItem);
  assert.equal(newItem.id, "item-3");
});

test("dedupes duplicate items and keeps incoming over existing", () => {
  const merged = mergeCacheData(baseData, {
    feeds: [],
    items: [
      { id: "item-1", feedUrl: "https://a.example/rss", published: "2024-01-01T12:00:00Z" },
      { id: "item-4", feedUrl: "https://d.example/rss", published: "2024-01-01T07:00:00Z" },
    ],
  });

  const duplicate = merged.items.find((item) => item.id === "item-1");
  assert.ok(duplicate && duplicate.published === "2024-01-01T12:00:00Z");
});

test("returns incoming cache when existing cache is undefined or null", () => {
  const incoming = {
    feeds: [{ feedUrl: "https://z.example/rss", feedTitle: "Feed Z" }],
    items: [
      { id: "z-item-2", feedUrl: "https://z.example/rss", published: "2024-01-01T12:00:00Z" },
      { id: "z-item-1", feedUrl: "https://z.example/rss", published: "2024-01-01T11:00:00Z" },
    ],
  };

  for (const existing of [undefined, null]) {
    const merged = mergeCacheData(existing, incoming);

    assert.equal(merged.feeds.length, 1);
    assert.equal(merged.feeds[0].feedTitle, "Feed Z");
    assert.equal(merged.items.length, 2);
    assert.equal(merged.items[0].id, "z-item-2");
  }
});

test("preserves existing data when incoming feeds and items are empty arrays", () => {
  const merged = mergeCacheData(baseData, { feeds: [], items: [] });

  assert.equal(merged.feeds.length, 2);
  assert.equal(merged.feeds[0].feedUrl, "https://a.example/rss");
  assert.equal(merged.feeds[1].feedUrl, "https://b.example/rss");
  assert.equal(merged.items.length, 2);
  assert.equal(merged.items[0].id, "item-1");
  assert.equal(merged.items[1].id, "item-2");
});

test("ignores incoming feeds missing feedUrl while preserving existing cache", () => {
  const merged = mergeCacheData(baseData, {
    feeds: [{ feedTitle: "Invalid Feed" }],
    items: [],
  });

  assert.equal(merged.feeds.length, 2);
  const hasInvalidFeed = merged.feeds.some((feed) => feed.feedTitle === "Invalid Feed");
  assert.equal(hasInvalidFeed, false);
});

test("handles incoming items missing id without crashes and keeps deterministic dedupe", () => {
  const merged = mergeCacheData(baseData, {
    feeds: [],
    items: [
      { feedUrl: "https://x.example/rss", published: "2024-01-01T13:00:00Z" },
      { feedUrl: "https://y.example/rss", published: "2024-01-01T07:30:00Z" },
    ],
  });

  assert.equal(merged.items.length, 3);
  assert.equal(merged.items[0].id, undefined);
  assert.equal(merged.items[0].published, "2024-01-01T13:00:00Z");
  assert.equal(merged.items.filter((item) => item.id === undefined).length, 1);
});
