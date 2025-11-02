// workers/rss-worker.ts
import type { Feed, FeedItem, ReaderViewResponse, FetchFeedsResponse } from '../types';
import { DEFAULT_API_CONFIG } from '../lib/config';
import { Logger } from '@/utils/logger';
import { transformFeedResponse } from '../lib/feed-transformer';

// Default cache TTL from environment (fallback to 30 minutes)
const DEFAULT_CACHE_TTL = (() => {
  const ttl = Number(process.env.NEXT_PUBLIC_WORKER_CACHE_TTL);
  return Number.isFinite(ttl) ? ttl : 30 * 60 * 1000; // 30 minutes
})();

// Message types to organize communication
type WorkerMessage =
  | { type: 'FETCH_FEEDS'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'FETCH_READER_VIEW'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'REFRESH_FEEDS'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'CHECK_UPDATES'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'SET_API_URL'; payload: { url: string } }
  | { type: 'SET_CACHE_TTL'; payload: { ttl: number } };

type WorkerResponse = 
  | { type: 'FEEDS_RESULT'; success: boolean; feeds: Feed[]; items: FeedItem[]; message?: string }
  | { type: 'READER_VIEW_RESULT'; success: boolean; data: ReaderViewResponse[]; message?: string }
  | { type: 'ERROR'; message: string };

// Cache implementation for the worker
class WorkerCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 30 * 60 * 1000) {
    this.ttl = ttl;
  }

  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if cache is still valid
    if (Date.now() - item.timestamp > this.ttl) {
      Logger.debug(`[Worker] Cache expired for key: ${key}`);
      this.cache.delete(key);
      return null;
    }
    else {
      Logger.debug(`[Worker] Cache hit for key: ${key}`);
    }
    
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Initialize worker cache and API URL
const workerCache = new WorkerCache(DEFAULT_CACHE_TTL);
let apiBaseUrl = DEFAULT_API_CONFIG.baseUrl;

/**
 * Retrieves RSS feeds and their items from the API, using caching to minimize redundant requests.
 *
 * @param urls - The list of feed URLs to fetch.
 * @param customApiUrl - Optional override for the API base URL.
 * @returns An object containing the fetched feeds and their items.
 *
 * @throws {Error} If the API response is invalid or the HTTP request fails.
 */
async function fetchFeeds(urls: string[], customApiUrl?: string): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  const currentApiUrl = customApiUrl || apiBaseUrl;
  try {
    // Generate cache key
    const cacheKey = `feeds:${urls.sort().join(',')}`;
    
    // Check cache first
    const cached = workerCache.get<{ feeds: Feed[]; items: FeedItem[] }>(cacheKey);
    if (cached) {
      Logger.debug('[Worker] Using cached feeds');
      return cached;
    }

    Logger.debug(`[Worker] Fetching feeds for URLs: ${urls.length}`);
    
    const response = await fetch(`${currentApiUrl}/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as FetchFeedsResponse;

    if (!data || !Array.isArray(data.feeds)) {
      throw new Error("Invalid response from API");
    }

    // Transform the response using shared utility
    const result = transformFeedResponse(data);

    // Cache the result
    workerCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("[Worker] Error fetching feeds:", error);
    throw error;
  }
}

/**
 * Retrieves reader view data for the specified URLs from the API, using caching to avoid redundant requests.
 *
 * @param urls - An array of URLs to fetch reader view data for.
 * @param customApiUrl - Optional API base URL to override the default.
 * @returns An array of {@link ReaderViewResponse} objects corresponding to the requested URLs.
 *
 * @throws {Error} If the API response is not successful or returns invalid data.
 */
async function fetchReaderView(urls: string[], customApiUrl?: string): Promise<ReaderViewResponse[]> {
  const currentApiUrl = customApiUrl || apiBaseUrl;
  try {
    // Generate cache key
    const cacheKey = `reader:${urls[0]}`;
    
    // Check cache first
    const cached = workerCache.get<ReaderViewResponse[]>(cacheKey);
    if (cached) {
      Logger.debug('[Worker] Using cached reader view');
      return cached;
    }

    Logger.debug("[Worker] Fetching reader view for URLs:", urls);
    
    const response = await fetch(`${currentApiUrl}/getreaderview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response from API");
    }
    
    // Cache the result
    workerCache.set(cacheKey, data);
    
    return data as ReaderViewResponse[];
  } catch (error) {
    console.error("[Worker] Error fetching reader view:", error);
    throw error;
  }
}

// Message handler
self.addEventListener('message', async (event) => {
  const message = event.data as WorkerMessage;
  
  try {
    switch (message.type) {
      case 'SET_API_URL': {
        const { url } = message.payload;
        apiBaseUrl = url;
        Logger.debug(`[Worker] API URL set to ${apiBaseUrl}`);
        // Clear cache when API URL changes
        workerCache.clear();
        break;
      }

      case 'SET_CACHE_TTL': {
        const { ttl } = message.payload;
        workerCache.setTTL(ttl);
        Logger.debug(`[Worker] Cache TTL set to ${ttl}ms`);
        // Clear cache when TTL changes
        workerCache.clear();
        break;
      }
        
      case 'FETCH_FEEDS': {
        const { urls, apiBaseUrl: customApiUrl } = message.payload;
        try {
          const { feeds, items } = await fetchFeeds(urls, customApiUrl);
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: true,
            feeds,
            items,
          } as WorkerResponse);
        } catch (error) {
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: false,
            feeds: [],
            items: [],
            message: error instanceof Error ? error.message : 'Failed to fetch feeds'
          } as WorkerResponse);
        }
        break;
      }
      
      case 'REFRESH_FEEDS': {
        const { urls, apiBaseUrl: customApiUrl } = message.payload;
        try {
          const { feeds, items } = await fetchFeeds(urls, customApiUrl);
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: true,
            feeds,
            items,
          } as WorkerResponse);
        } catch (error) {
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: false,
            feeds: [],
            items: [],
            message: error instanceof Error ? error.message : 'Failed to refresh feeds'
          } as WorkerResponse);
        }
        break;
      }
      
      case 'FETCH_READER_VIEW': {
        const { urls, apiBaseUrl: customApiUrl } = message.payload;
        try {
          const data = await fetchReaderView(urls, customApiUrl);
          self.postMessage({
            type: 'READER_VIEW_RESULT',
            success: true,
            data,
          } as WorkerResponse);
        } catch (error) {
          self.postMessage({
            type: 'READER_VIEW_RESULT',
            success: false,
            data: [],
            message: error instanceof Error ? error.message : 'Failed to fetch reader view'
          } as WorkerResponse);
        }
        break;
      }
      
      case 'CHECK_UPDATES': {
        const { urls, apiBaseUrl: customApiUrl } = message.payload;
        try {
          Logger.debug("[Worker] Checking for updates");
          // Clear cache to ensure fresh data
          workerCache.clear();
          const { feeds, items } = await fetchFeeds(urls, customApiUrl);
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: true,
            feeds,
            items,
          } as WorkerResponse);
        } catch (error) {
          console.error("[Worker] Error checking for updates:", error);
          self.postMessage({
            type: 'FEEDS_RESULT',
            success: false,
            feeds: [],
            items: [],
            message: error instanceof Error ? error.message : 'Failed to check for updates'
          } as WorkerResponse);
        }
        break;
      }
      
      default:
        self.postMessage({
          type: 'ERROR',
          message: `Unknown message type: ${(message as any).type}`
        } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error in worker'
    } as WorkerResponse);
  }
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Worker] Unhandled promise rejection:', event.reason);
  self.postMessage({
    type: 'ERROR',
    message: `Unhandled error in worker: ${event.reason?.message || 'Unknown error'}`
  } as WorkerResponse);
});

// Log worker startup
Logger.debug('[Feed Worker] RSS worker initialized');
