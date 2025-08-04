/**
 * CORRECTED API SCHEMA TYPES - Based on actual API response
 * This represents the TRUE schema from https://api.digests.app/docs
 */

export interface APIAuthor {
  email: string;
  name: string;
}

export interface APIEnclosure {
  length: string;
  type: string;
  url: string;
}

export interface APIFeedItem {
  author: string;
  categories: string[];
  content: string;
  content_encoded: string;
  created: string; // ISO date string "2019-08-24T14:15:22Z"
  description: string;
  duration: string; // API returns string, not number!
  enclosures: APIEnclosure[];
  episode: number;
  episode_type: string;
  id: string;
  // ... API schema was cut off, but we can see the pattern

  // Fields that might be missing from API but we use:
  link?: string;
  published?: string;
  title?: string;
  thumbnail?: string;
  thumbnailColor?: string;
  thumbnailColorComputed?: boolean;
  feedUrl?: string;
  favicon?: string;
  siteTitle?: string; // Might be derived/computed
  siteName?: string; // Might be derived/computed
  feedTitle?: string; // Might be derived/computed
}

export interface APIFeed {
  // API ACTUAL FIELDS:
  id: string; // NOT guid!
  author: APIAuthor; // NOT string, but object!
  categories: string; // NOT array, but string!
  content_changed: boolean;
  content_hash: string;
  description: string;
  favicon: string;
  feedUrl: string;
  feed_type: string;
  image: string;
  items: APIFeedItem[];

  // Fields that might be missing from API but we use:
  type?: string; // Might be derived
  guid?: string; // Might be computed from id
  status?: string; // Might be derived
  siteTitle?: string; // Might be derived
  siteName?: string; // Might be derived
  feedTitle?: string; // Might be derived
  link?: string; // Might be derived
  lastUpdated?: string; // Might be derived
  lastRefreshed?: string; // Might be derived
  published?: string; // Might be derived
  language?: string; // Might be derived
}

/**
 * CRITICAL SCHEMA MISMATCHES IDENTIFIED:
 *
 * 1. Feed.id vs Feed.guid - API uses 'id', we use 'guid'
 * 2. Feed.author - API: {email, name} object, We: string|null
 * 3. Feed.categories - API: string, We: string[]
 * 4. FeedItem.duration - API: string, We: number
 * 5. Missing fields: content_changed, content_hash, feed_type, image, episode, episode_type
 * 6. Extra fields: guid, status, siteTitle, siteName (might be computed by our worker)
 */

export interface ParseFeedsResponse {
  feeds: APIFeed[];
}
