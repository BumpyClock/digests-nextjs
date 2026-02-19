/**
 * Pure selector functions for data transformation and filtering
 *
 * These functions are extracted from Zustand slices to make them
 * reusable across React Query selectors and other components.
 */

import type { Feed, FeedItem } from "@/types";
import type { Subscription } from "@/types/subscription";

/**
 * Sort feed items by published date (newest first)
 *
 * Extracted from:
 * - hooks/queries/use-feeds-data.ts select
 * - store/slices/itemsSlice.ts lines 15-20
 */
export function sortByDateDesc(a: FeedItem, b: FeedItem): number {
  // Handle multiple date field formats (published, pubDate)
  const dateA = new Date(a.published ?? (a as { pubDate?: string }).pubDate ?? 0).getTime();
  const dateB = new Date(b.published ?? (b as { pubDate?: string }).pubDate ?? 0).getTime();
  return dateB - dateA; // Newest first
}

/**
 * Transform a full Feed object into a lightweight Subscription
 *
 * This is used when migrating from storing full Feed objects
 * to storing only essential metadata in Zustand.
 */
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
