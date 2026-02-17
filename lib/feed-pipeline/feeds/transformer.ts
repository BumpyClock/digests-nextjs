import type { Feed, FeedItem, FetchFeedsResponse } from "@/types";
import { hashString } from "@/utils/hash";

/**
 * Generates a stable GUID for a feed using deterministic hashing
 *
 * @param feed - The feed object
 * @returns A stable GUID string
 */
function generateFeedGuid(feed: Feed): string {
  if (feed.guid) return feed.guid;
  if (feed.link) return hashString(feed.link);
  // Fallback: hash a stable representation of the feed
  return hashString(
    JSON.stringify({
      feedUrl: feed.feedUrl,
      feedTitle: feed.feedTitle,
      siteTitle: feed.siteTitle,
    })
  );
}

/**
 * Generates a stable ID for a feed item using deterministic hashing
 *
 * @param item - The feed item object
 * @param feedGuid - The parent feed's GUID
 * @returns A stable ID string
 */
function generateItemId(item: FeedItem, feedGuid: string): string {
  if (item.id) return item.id;
  // Use feed GUID + item link or title for deterministic ID
  const itemKey = item.link || item.title || "";
  return hashString(`${feedGuid}:${itemKey}`);
}

/**
 * Transforms raw feed data from API response into normalized Feed objects
 * Uses deterministic hashing for missing guid/id fields to ensure stable identifiers
 *
 * @param data - Raw API response containing feeds array
 * @returns Object containing normalized feeds array and flattened items array
 *
 * @example
 * ```ts
 * const response = await fetch('/api/parse', { ... });
 * const data = await response.json();
 * const { feeds, items } = transformFeedResponse(data);
 * ```
 */
export function transformFeedResponse(data: FetchFeedsResponse): {
  feeds: Feed[];
  items: FeedItem[];
} {
  const feeds: Feed[] = data.feeds.map((feed: Feed) => {
    // Generate stable GUID for the feed
    const feedGuid = generateFeedGuid(feed);

    // Compute feed-level derived values once (avoid re-evaluating per item)
    const derivedSiteName = feed.siteName || feed.siteTitle || feed.title || feed.feedTitle;
    const derivedSiteTitle = feed.siteTitle || feed.title || feed.feedTitle;
    const derivedFeedTitle = feed.feedTitle || feed.title;

    return {
      type: feed.type,
      guid: feedGuid,
      status: feed.status,
      siteName: feed.siteName || feed.title || feed.feedTitle,
      siteTitle: feed.siteTitle,
      title: feed.title,
      feedTitle: feed.feedTitle,
      feedUrl: feed.feedUrl,
      description: feed.description,
      link: feed.link,
      lastUpdated: feed.lastUpdated,
      lastRefreshed: feed.lastRefreshed,
      published: feed.published,
      author: feed.author,
      language: feed.language,
      favicon: feed.favicon,
      categories: feed.categories,
      items: Array.isArray(feed.items)
        ? feed.items.map((item: FeedItem) => ({
            type: item.type,
            id: generateItemId(item, feedGuid),
            title: item.title,
            description: item.description,
            link: item.link,
            author: item.author,
            published: item.published,
            content: item.content,
            created: item.created,
            content_encoded: item.content_encoded,
            categories: item.categories,
            enclosures: item.enclosures,
            thumbnail: item.thumbnail,
            thumbnailColor: item.thumbnailColor,
            thumbnailColorComputed: item.thumbnailColorComputed,
            siteName: derivedSiteName,
            siteTitle: derivedSiteTitle,
            feedTitle: derivedFeedTitle,
            feedUrl: feed.feedUrl,
            favicon: feed.favicon,
            favorite: false,
          }))
        : [],
    };
  });

  // Flatten all items from all feeds into a single array
  const items: FeedItem[] = feeds.flatMap((feed) => feed.items || []);

  return { feeds, items };
}
