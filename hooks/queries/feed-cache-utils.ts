import type { Feed, FeedItem } from "../../types";
import { sortByDateDesc } from "../../utils/selectors";

export type CacheData = {
  feeds: Feed[];
  items: FeedItem[];
};

const mergeMap = <T extends { id: string }>(items: T[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const sortAndDedupeItems = (items: FeedItem[]) => [...mergeMap(items)].sort(sortByDateDesc);

export const mergeCacheData = (existing: CacheData | undefined, incoming: CacheData): CacheData => {
  if (!existing) {
    return {
      feeds: incoming.feeds,
      items: sortAndDedupeItems(incoming.items),
    };
  }

  const feedMap = new Map<string, Feed>();
  for (const feed of existing.feeds) {
    feedMap.set(feed.feedUrl, feed);
  }
  for (const feed of incoming.feeds) {
    if (feed.feedUrl) {
      feedMap.set(feed.feedUrl, feed);
    }
  }

  return {
    feeds: Array.from(feedMap.values()),
    items: sortAndDedupeItems([...existing.items, ...incoming.items]),
  };
};
