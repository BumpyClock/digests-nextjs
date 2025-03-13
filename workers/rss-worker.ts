// workers/rss-worker.ts
import type { Feed, FeedItem, ReaderViewResponse } from '../types';

// Message types to organize communication
type WorkerMessage = 
  | { type: 'FETCH_FEEDS'; payload: { urls: string[] } }
  | { type: 'FETCH_READER_VIEW'; payload: { urls: string[] } }
  | { type: 'REFRESH_FEEDS'; payload: { urls: string[] } }
  | { type: 'CHECK_UPDATES'; payload: { urls: string[] } };

type WorkerResponse = 
  | { type: 'FEEDS_RESULT'; success: boolean; feeds: Feed[]; items: FeedItem[]; message?: string }
  | { type: 'READER_VIEW_RESULT'; success: boolean; data: ReaderViewResponse[]; message?: string }
  | { type: 'ERROR'; message: string };

// Cache implementation for the worker
class WorkerCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if cache is still valid
    if (Date.now() - item.timestamp > this.TTL) {
      console.log(`[Worker] Cache expired for key: ${key}`);
      this.cache.delete(key);
      return null;
    }
    else {
      console.log(`[Worker] Cache hit for key: ${key}`);
    }
    
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Initialize worker cache
const workerCache = new WorkerCache();

/**
 * Fetches feeds from the API
 */
async function fetchFeeds(urls: string[]): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  try {
    // Generate cache key
    const cacheKey = `feeds:${urls.sort().join(',')}`;
    
    // Check cache first
    const cached = workerCache.get<{ feeds: Feed[]; items: FeedItem[] }>(cacheKey);
    if (cached) {
      console.log('[Worker] Using cached feeds');
      return cached;
    }

    console.log(`[Worker] Fetching feeds for URLs: ${urls.length}`);
    
    const response = await fetch("https://api.digests.app/parse", {
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

    if (!data || !Array.isArray(data.feeds)) {
      throw new Error("Invalid response from API");
    }

    const feeds: Feed[] = data.feeds.map((feed: Feed) => ({
      type: feed.type,
      guid: feed.guid,
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
        id: item.id,
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
        siteTitle: feed.siteTitle,
        feedTitle: feed.feedTitle,
        feedUrl: feed.feedUrl,
        favicon: feed.favicon,
        favorite: false,
      })) : [],
    }));

    const items: FeedItem[] = feeds.flatMap(feed => feed.items || []);
    
    // Cache the result
    const result = { feeds, items };
    workerCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error("[Worker] Error fetching feeds:", error);
    throw error;
  }
}

/**
 * Fetches reader view from the API
 */
async function fetchReaderView(urls: string[]): Promise<ReaderViewResponse[]> {
  try {
    // Generate cache key
    const cacheKey = `reader:${urls[0]}`;
    
    // Check cache first
    const cached = workerCache.get<ReaderViewResponse[]>(cacheKey);
    if (cached) {
      console.log('[Worker] Using cached reader view');
      return cached;
    }

    console.log("[Worker] Fetching reader view for URLs:", urls);
    
    const response = await fetch("https://api.digests.app/getreaderview", {
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
      case 'FETCH_FEEDS': {
        const { urls } = message.payload;
        try {
          const { feeds, items } = await fetchFeeds(urls);
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
        const { urls } = message.payload;
        try {
          const { feeds, items } = await fetchFeeds(urls);
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
        const { urls } = message.payload;
        try {
          const data = await fetchReaderView(urls);
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
        const { urls } = message.payload;
        try {
          console.log("[Worker] Checking for updates");
          // Clear cache to ensure fresh data
          workerCache.clear();
          const { feeds, items } = await fetchFeeds(urls);
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
console.log('[Feed Worker] RSS worker initialized');