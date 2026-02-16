import test from "node:test";
import assert from "node:assert";
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
  assert.equal(merged.feeds[1].feedTitle, "Feed B Updated");
  assert.equal(merged.items.length, 3);
  assert.equal(merged.items[0].id, "item-3");
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
