import { fetchParseFeeds, fetchReaderViewData } from "@/lib/feed-api-client";
import type { Feed, FeedItem, ReaderViewResponse } from "@/types";
import { Logger } from "@/utils/logger";
import type { FeedFetcherConfig } from "./interfaces/feed-fetcher.interface";

/**
 * Fetches feeds from the API
 * @param urls - Array of feed URLs to fetch
 * @param config - Optional configuration for API base URL
 * @returns Promise with feeds and items
 */
export async function fetchFeeds(
  urls: string[],
  config?: FeedFetcherConfig
): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  try {
    Logger.debug(`Fetching feeds for URLs: ${urls.length}`);
    Logger.debug("Feed URLs", urls);
    return fetchParseFeeds(urls, config?.apiBaseUrl);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    throw error;
  }
}

/**
 * Fetches reader view data from the API
 * @param urls - Array of article URLs to fetch
 * @param config - Optional configuration for API base URL
 * @returns Promise with reader view responses
 */
export async function fetchReaderView(
  urls: string[],
  config?: FeedFetcherConfig
): Promise<ReaderViewResponse[]> {
  try {
    Logger.debug("Fetching reader view for URLs:", urls);
    return fetchReaderViewData(urls, config?.apiBaseUrl);
  } catch (error) {
    console.error("Error fetching reader view:", error);
    throw error;
  }
}
