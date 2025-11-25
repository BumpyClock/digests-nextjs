// workers/rss-worker.ts
import type { Feed, FeedItem, ReaderViewResponse, FetchFeedsResponse } from '../types';
import { DEFAULT_API_CONFIG, DEFAULT_CACHE_TTL_MS } from '../lib/config';
import { Logger } from '@/utils/logger';
import { transformFeedResponse } from '../lib/feed-transformer';

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
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = DEFAULT_CACHE_TTL_MS) {
    this.ttl = ttl;
  }

  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  set<T>(key: string, data: T): void {
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
const workerCache = new WorkerCache(DEFAULT_CACHE_TTL_MS);
let apiBaseUrl = DEFAULT_API_CONFIG.baseUrl;

/**
 * Retrieves RSS feeds and their items from the API, using caching to minimize redundant requests.
 *
 * @param urls - The list of feed URLs to fetch.
 * @param customApiUrl - Optional override for the API base URL.
 * @param options - Optional configuration object.
 * @param options.bypassCache - If true, skip cache read and force fresh fetch. Fresh data is still cached.
 * @returns An object containing the fetched feeds and their items.
 *
 * @throws {Error} If the API response is invalid or the HTTP request fails.
 */
async function fetchFeeds(
  urls: string[],
  customApiUrl?: string,
  options?: { bypassCache?: boolean }
): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  const currentApiUrl = customApiUrl || apiBaseUrl;
  const { bypassCache = false } = options ?? {};

  try {
    // Generate cache key from sorted copy to avoid mutating caller's array
    const cacheKey = `feeds:${[...urls].sort().join(',')}`;

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = workerCache.get<{ feeds: Feed[]; items: FeedItem[] }>(cacheKey);
      if (cached) {
        Logger.debug('[Worker] Using cached feeds');
        return cached;
      }
    } else {
      Logger.debug('[Worker] Bypassing cache for fresh fetch');
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

    // Always cache the fresh result to keep cache updated
    // bypassCache only controls cache reads, not writes
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

// Define handler type
type MessageHandler = (payload: unknown) => Promise<WorkerResponse | undefined> | WorkerResponse | undefined;

// Create handler registry
const messageHandlers: Record<string, MessageHandler> = {
  /**
   * Set API URL handler
   */
  SET_API_URL: ({ url }: { url: string }) => {
    apiBaseUrl = url;
    Logger.debug(`[Worker] API URL set to ${apiBaseUrl}`);
    workerCache.clear();
  },

  /**
   * Set cache TTL handler
   */
  SET_CACHE_TTL: ({ ttl }: { ttl: number }) => {
    workerCache.setTTL(ttl);
    Logger.debug(`[Worker] Cache TTL set to ${ttl}ms`);
    workerCache.clear();
  },

  /**
   * Fetch feeds handler
   */
  FETCH_FEEDS: async ({ urls, apiBaseUrl: customApiUrl }: { urls: string[]; apiBaseUrl?: string }) => {
    try {
      const { feeds, items } = await fetchFeeds(urls, customApiUrl);
      return {
        type: 'FEEDS_RESULT',
        success: true,
        feeds,
        items,
      } as WorkerResponse;
    } catch (error) {
      return {
        type: 'FEEDS_RESULT',
        success: false,
        feeds: [],
        items: [],
        message: error instanceof Error ? error.message : 'Failed to fetch feeds'
      } as WorkerResponse;
    }
  },

  /**
   * Refresh feeds handler - bypasses cache to force fresh fetch
   */
  REFRESH_FEEDS: async ({ urls, apiBaseUrl: customApiUrl }: { urls: string[]; apiBaseUrl?: string }) => {
    try {
      const { feeds, items } = await fetchFeeds(urls, customApiUrl, { bypassCache: true });
      return {
        type: 'FEEDS_RESULT',
        success: true,
        feeds,
        items,
      } as WorkerResponse;
    } catch (error) {
      return {
        type: 'FEEDS_RESULT',
        success: false,
        feeds: [],
        items: [],
        message: error instanceof Error ? error.message : 'Failed to refresh feeds'
      } as WorkerResponse;
    }
  },

  /**
   * Fetch reader view handler
   */
  FETCH_READER_VIEW: async ({ urls, apiBaseUrl: customApiUrl }: { urls: string[]; apiBaseUrl?: string }) => {
    try {
      const data = await fetchReaderView(urls, customApiUrl);
      return {
        type: 'READER_VIEW_RESULT',
        success: true,
        data,
      } as WorkerResponse;
    } catch (error) {
      return {
        type: 'READER_VIEW_RESULT',
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Failed to fetch reader view'
      } as WorkerResponse;
    }
  },

  /**
   * Check updates handler
   */
  CHECK_UPDATES: async ({ urls, apiBaseUrl: customApiUrl }: { urls: string[]; apiBaseUrl?: string }) => {
    try {
      Logger.debug("[Worker] Checking for updates");
      workerCache.clear();
      const { feeds, items } = await fetchFeeds(urls, customApiUrl);
      return {
        type: 'FEEDS_RESULT',
        success: true,
        feeds,
        items,
      } as WorkerResponse;
    } catch (error) {
      console.error("[Worker] Error checking for updates:", error);
      return {
        type: 'FEEDS_RESULT',
        success: false,
        feeds: [],
        items: [],
        message: error instanceof Error ? error.message : 'Failed to check for updates'
      } as WorkerResponse;
    }
  },
};

/**
 * Main message event listener using handler registry
 * New handlers can be added to messageHandlers object without modifying this code
 */
self.addEventListener('message', async (event) => {
  const message = event.data as WorkerMessage;

  try {
    const handler = messageHandlers[message.type];

    if (!handler) {
      self.postMessage({
        type: 'ERROR',
        message: `Unknown message type: ${message.type}`
      } as WorkerResponse);
      return;
    }

    // Execute handler and send response if any
    const response = await handler(message.payload);
    if (response) {
      self.postMessage(response);
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
