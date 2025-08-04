/**
 * Core feed and feed item types for the RSS reader
 */

export interface FeedItem {
  type: string;
  id: string;
  title: string;
  description: string;
  link: string;
  author: string;
  published: string;
  pubDate?: string; // Added for backward compatibility
  content: string;
  created: string;
  content_encoded: string;
  content_html?: string; // Added missing property
  categories: string[];
  category?: string; // Added missing property
  url?: string; // Added missing property
  feed_id?: string; // Added missing property
  attachments?: any[]; // Added missing property
  enclosures: Enclosure[] | null;
  thumbnail: string;
  thumbnailColor: { r: number; g: number; b: number } | string; // Support both formats
  thumbnailColorComputed: boolean | string; // Support both boolean and string for backward compatibility
  siteTitle: string;
  siteName: string;
  feedTitle: string;
  feedUrl: string;
  favicon: string;
  favorite?: boolean;
  duration?: number;
  itunesEpisode?: string;
  itunesSeason?: string;
  feedImage?: string;
  readingTime?: number;
  wordCount?: number;
  sentiment?: number;
  extractedContent?: string;
  content_text?: string;
  guid?: string;
  summary?: string;
}

export interface Feed {
  type: string;
  id?: string; // Added missing property
  guid: string;
  status: string;
  siteTitle: string;
  siteName: string;
  feedTitle: string;
  feedUrl: string;
  url?: string; // Added missing property
  description: string;
  link: string;
  lastUpdated: string;
  lastRefreshed: string;
  published: string;
  author: string | null;
  language: string;
  favicon: string;
  categories: string[]; // Feed categories is an array of strings for consistency with FeedItem
  category?: string; // Added missing property
  items?: FeedItem[];
  // Additional fields required by tests
  favorite?: boolean;
  itemCount?: number;
  fetchFrequency?: number;
  errorCount?: number;
}

export interface Enclosure {
  url: string;
  type: string;
  length?: string;
}
