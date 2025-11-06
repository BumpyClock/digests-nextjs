import type { Feed, FeedItem, ReaderViewResponse } from '@/types';
import type { IFeedFetcher, FeedFetcherConfig } from './interfaces/feed-fetcher.interface';
import { fetchFeeds as fetchFeedsFromApi, fetchReaderView as fetchReaderViewFromApi } from './rss';

/**
 * Standard feed fetcher implementation using HTTP API
 * Can be replaced with mock implementation for testing
 */
export class HttpFeedFetcher implements IFeedFetcher {
  constructor(private config?: FeedFetcherConfig) {}

  async fetchFeeds(urls: string[]): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
    return fetchFeedsFromApi(urls);
  }

  async fetchReaderView(urls: string[]): Promise<ReaderViewResponse[]> {
    return fetchReaderViewFromApi(urls);
  }
}

/**
 * Factory function to create feed fetcher instance
 */
export function createFeedFetcher(config?: FeedFetcherConfig): IFeedFetcher {
  return new HttpFeedFetcher(config);
}
