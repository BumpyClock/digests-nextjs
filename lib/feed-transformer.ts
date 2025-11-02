import type { Feed, FeedItem, FetchFeedsResponse } from '@/types'

/**
 * Creates a deterministic hash from a string using SHA-256
 * Returns a base64url-encoded hash for use as a stable identifier
 *
 * @param input - The string to hash
 * @returns A deterministic hash string
 */
function hashString(input: string): string {
  // Use a simple but deterministic hash for now
  // This could be upgraded to SHA-256 if needed, but for ID purposes
  // a simpler hash is sufficient and faster
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 string for compact representation
  return Math.abs(hash).toString(36);
}

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
  return hashString(JSON.stringify({
    feedUrl: feed.feedUrl,
    feedTitle: feed.feedTitle,
    siteTitle: feed.siteTitle
  }));
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
  const itemKey = item.link || item.title || '';
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
export function transformFeedResponse(data: FetchFeedsResponse): { feeds: Feed[]; items: FeedItem[] } {
  const feeds: Feed[] = data.feeds.map((feed: Feed) => {
    // Generate stable GUID for the feed
    const feedGuid = generateFeedGuid(feed);

    return {
      type: feed.type,
      guid: feedGuid,
      status: feed.status,
      siteTitle: feed.siteTitle,
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
      items: Array.isArray(feed.items) ? feed.items.map((item: FeedItem) => ({
        type: item.type,
        // Generate stable ID using feed GUID and item properties
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
        // Inherit feed metadata for easy access at item level
        siteTitle: feed.siteTitle,
        feedTitle: feed.feedTitle,
        feedUrl: feed.feedUrl,
        favicon: feed.favicon,
        favorite: false,
      })) : [],
    };
  });

  // Flatten all items from all feeds into a single array
  const items: FeedItem[] = feeds.flatMap(feed => feed.items || [])

  return { feeds, items }
}
