import type { Feed, FeedItem, ReaderViewResponse } from '@/types';

/**
 * Interface for feed fetching implementations
 * Allows dependency injection and easier testing
 */
export interface IFeedFetcher {
  /**
   * Fetches feeds from the specified URLs
   * @param urls - Array of feed URLs to fetch
   * @returns Promise with feeds and items
   */
  fetchFeeds(urls: string[]): Promise<{ feeds: Feed[]; items: FeedItem[] }>;

  /**
   * Fetches reader view data for URLs
   * @param urls - Array of article URLs to fetch reader view for
   * @returns Promise with reader view responses
   */
  fetchReaderView(urls: string[]): Promise<ReaderViewResponse[]>;
}

/**
 * Configuration options for feed fetchers
 */
export interface FeedFetcherConfig {
  /** Base URL for API */
  apiBaseUrl?: string;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
}
