/**
 * Canonical pure selectors for feed/store/query domains.
 *
 * Read when:
 * - You need pure data transforms for feed/query/store flows.
 * - You are adding selectors used by React Query and Zustand.
 */

import type { Feed, FeedItem } from "@/types";
import type { Subscription } from "@/types/subscription";

export function sortByDateDesc(a: FeedItem, b: FeedItem): number {
  const dateA = new Date(a.published ?? (a as { pubDate?: string }).pubDate ?? 0).getTime();
  const dateB = new Date(b.published ?? (b as { pubDate?: string }).pubDate ?? 0).getTime();
  return dateB - dateA;
}

export function filterUnread(items: FeedItem[], read: Set<string>): FeedItem[] {
  const readSet = read instanceof Set ? read : new Set<string>();
  return items.filter((item) => item?.id && !readSet.has(item.id));
}

export function filterByFeed(items: FeedItem[], normalizedFeedUrl?: string): FeedItem[] {
  if (!normalizedFeedUrl) return items;

  return items.filter(
    (item) => item?.feedUrl && item.feedUrl.length > 0 && item.feedUrl.includes(normalizedFeedUrl)
  );
}

export function toSubscription(feed: Feed | Subscription): Subscription {
  return {
    feedUrl: feed.feedUrl,
    feedTitle: feed.feedTitle || feed.siteTitle,
    siteName: feed.siteName || "",
    siteTitle: feed.siteTitle || feed.feedTitle,
    title: feed.title || "",
    favicon: feed.favicon || "",
    language: feed.language || "en",
  };
}
