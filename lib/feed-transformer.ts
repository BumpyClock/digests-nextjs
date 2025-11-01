import type { Feed, FeedItem, FetchFeedsResponse } from '@/types'

/**
 * Transforms raw feed data from API response into normalized Feed objects
 * Includes fallback logic for missing guid/id fields to ensure data integrity
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
  const feeds: Feed[] = data.feeds.map((feed: Feed) => ({
    type: feed.type,
    // Fallback chain: use feed.guid -> sanitized link -> random UUID
    guid: feed.guid || feed.link?.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID(),
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
      // Fallback chain: use item.id -> sanitized link -> random UUID
      id: item.id || item.link?.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID(),
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
  }))

  // Flatten all items from all feeds into a single array
  const items: FeedItem[] = feeds.flatMap(feed => feed.items || [])

  return { feeds, items }
}
