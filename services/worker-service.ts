// services/worker-service.ts
import type { Feed, FeedItem, ReaderViewResponse } from '../types';
import type { IFeedFetcher } from '@/lib/interfaces/feed-fetcher.interface';
import { createFeedFetcher } from '@/lib/feed-fetcher';
import { generateCardShadows } from '../utils/shadow';
import { getApiConfig } from '@/store/useApiConfigStore';
import { Logger } from '@/utils/logger';
import { DEFAULT_CACHE_TTL_MS } from '@/lib/config';

const isClient = typeof window !== 'undefined'

// Define the types for messages to and from the worker
type WorkerMessage =
  | { type: 'FETCH_FEEDS'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'FETCH_READER_VIEW'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'REFRESH_FEEDS'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'GENERATE_SHADOWS'; payload: { 
      id: string;
      color: { r: number, g: number, b: number }; 
      isDarkMode: boolean 
    } }
  | { type: 'CHECK_UPDATES'; payload: { urls: string[]; apiBaseUrl?: string } }
  | { type: 'SET_API_URL'; payload: { url: string } }
  | { type: 'SET_CACHE_TTL'; payload: { ttl: number } };

type WorkerResponse = 
  | { type: 'FEEDS_RESULT'; success: boolean; feeds: Feed[]; items: FeedItem[]; message?: string }
  | { type: 'READER_VIEW_RESULT'; success: boolean; data: ReaderViewResponse[]; message?: string }
  | { type: 'SHADOWS_RESULT'; payload: { 
      id: string;
      shadows: { restShadow: string, hoverShadow: string, pressedShadow: string } 
    } }
  | { type: 'ERROR'; message: string };

/**
 * A service that manages the RSS web worker
 */
class WorkerService {
  private rssWorker: Worker | null = null;
  private shadowWorker: Worker | null = null;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isInitialized = false;
  private fallbackMode = false;
  private cacheTtl = DEFAULT_CACHE_TTL_MS;
  private readonly WORKER_TIMEOUT_MS = 30000; // 30 seconds
  private fallbackFetcher: IFeedFetcher; // NEW

  constructor(fallbackFetcher?: IFeedFetcher) {
    // Allow injection of custom fetcher (for testing)
    this.fallbackFetcher = fallbackFetcher || createFeedFetcher();
  }

  /**
   * Initializes the worker service
   */
  initialize(): void {
    if (this.isInitialized || !isClient) return;
    
    try {
      // Dynamically import workers only on client side
      this.rssWorker = new Worker(
        new URL('../workers/rss-worker.ts', import.meta.url), 
        { type: 'module' }
      );
      this.shadowWorker = new Worker(
        new URL('../workers/shadow-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Set up message handlers for both workers
      this.rssWorker.addEventListener('message', this.handleWorkerMessage);
      this.shadowWorker.addEventListener('message', this.handleWorkerMessage);
      
      // Initialize RSS worker with current API URL
      const apiConfig = getApiConfig();
      this.rssWorker.postMessage({
        type: 'SET_API_URL',
        payload: { url: apiConfig.baseUrl }
      });
      this.rssWorker.postMessage({
        type: 'SET_CACHE_TTL',
        payload: { ttl: this.cacheTtl }
      });
      
      this.isInitialized = true;
      Logger.debug('WorkerService: Workers initialized');
    } catch (error) {
      Logger.error('WorkerService: Failed to initialize workers', error instanceof Error ? error : undefined);
      // Ensure service can still work without workers
      this.fallbackMode = true;
    }
  }
  
  /**
   * Updates the API URL in the worker
   */
  updateApiUrl(url: string): void {
    if (!this.isInitialized) this.initialize();
    
    if (this.rssWorker) {
      this.rssWorker.postMessage({
        type: 'SET_API_URL',
        payload: { url }
      });
    }
  }

  /**
   * Updates cache TTL in the worker
   */
  updateCacheTtl(ttl: number): void {
    this.cacheTtl = ttl;
    if (!this.isInitialized) this.initialize();
    if (this.rssWorker) {
      this.rssWorker.postMessage({
        type: 'SET_CACHE_TTL',
        payload: { ttl }
      });
    }
  }

  /**
   * Handles messages from the worker
   */
  private handleWorkerMessage = (event: MessageEvent): void => {
    const response = event.data as WorkerResponse;

    // Log errors
    if (response.type === 'ERROR') {
      Logger.error(`WorkerService: Error from worker - ${response.message}`);
    }

    // Call handlers for this message type
    const handlers = this.messageHandlers.get(response.type);
    if (handlers) {
      handlers.forEach(handler => handler(response));
    }
  };

  /**
   * Registers a handler for a message type
   */
  onMessage<T extends WorkerResponse['type']>(
    type: T, 
    handler: (data: Extract<WorkerResponse, { type: T }>) => void
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler as any);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as any);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  /**
   * Posts a message to the worker
   */
  postMessage(message: WorkerMessage): void {
    if (!this.isInitialized) {
      Logger.error('WorkerService: Workers not initialized');
      return;
    }

    // Route messages to appropriate worker
    if (message.type === 'GENERATE_SHADOWS') {
      this.shadowWorker?.postMessage(message);
    } else {
      this.rssWorker?.postMessage(message);
    }
  }

  /**
   * Sends a message to a worker and returns a promise that resolves with the response
   * Handles initialization, fallback mode, one-time message handling, and timeout
   * @param worker - The worker to send the message to ('rss' or 'shadow')
   * @param message - The message to send
   * @param expectedResponseType - The expected response type to listen for
   * @param fallbackFn - Optional fallback function to call if worker is not available
   * @param responseFilter - Optional filter to match specific responses (e.g., for shadow generation by id)
   * @returns Promise that resolves with the response data or rejects on timeout/error
   */
  private sendWorkerMessage<T extends WorkerResponse>(
    worker: 'rss' | 'shadow',
    message: WorkerMessage,
    expectedResponseType: T['type'],
    fallbackFn?: () => Promise<any>,
    responseFilter?: (response: T) => boolean
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Initialize if not already
      if (!this.isInitialized) this.initialize();

      // Check if worker is available
      const workerInstance = worker === 'rss' ? this.rssWorker : this.shadowWorker;

      if (!workerInstance) {
        if (fallbackFn) {
          Logger.warn('WorkerService: Worker not available, using fallback');
          fallbackFn()
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Worker not available and no fallback provided'));
        }
        return;
      }

      let timeoutId: NodeJS.Timeout | number | null = null;
      let unsubscribe: (() => void) | null = null;

      // Cleanup function to ensure all resources are released
      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId as any);
          timeoutId = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Worker message timeout after ${this.WORKER_TIMEOUT_MS}ms`));
      }, this.WORKER_TIMEOUT_MS);

      // Register one-time handler for response
      unsubscribe = this.onMessage(expectedResponseType, (response) => {
        // Apply filter if provided - if false, keep listener active
        if (responseFilter && !responseFilter(response as T)) {
          return;
        }

        // Filter matched or no filter - clean up and resolve
        cleanup();
        resolve(response as T);
      });

      // Send message to worker
      this.postMessage(message);
    });
  }

  /**
   * Fetches feeds from the worker
   */
  async fetchFeeds(url: string): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    const apiConfig = getApiConfig();

    const response = await this.sendWorkerMessage<Extract<WorkerResponse, { type: 'FEEDS_RESULT' }>>(
      'rss',
      {
        type: 'FETCH_FEEDS',
        payload: {
          urls: [url],
          apiBaseUrl: apiConfig.baseUrl
        }
      },
      'FEEDS_RESULT',
      async () => {
        Logger.debug('[WorkerService] Using fallback fetcher');
        try {
          const result = await this.fallbackFetcher.fetchFeeds([url]);
          return { success: true, ...result };
        } catch (error: any) {
          return {
            success: false,
            feeds: [],
            items: [],
            message: error.message
          };
        }
      }
    );

    return {
      success: response.success,
      feeds: response.feeds,
      items: response.items,
      message: response.message
    };
  }

  /**
   * Refreshes feeds from the worker
   */
  async refreshFeeds(urls: string[]): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    const apiConfig = getApiConfig();

    const response = await this.sendWorkerMessage<Extract<WorkerResponse, { type: 'FEEDS_RESULT' }>>(
      'rss',
      {
        type: 'REFRESH_FEEDS',
        payload: {
          urls,
          apiBaseUrl: apiConfig.baseUrl
        }
      },
      'FEEDS_RESULT',
      async () => {
        Logger.debug('[WorkerService] Using fallback fetcher for refresh');
        try {
          const result = await this.fallbackFetcher.fetchFeeds(urls);
          return { success: true, ...result };
        } catch (error: any) {
          return {
            success: false,
            feeds: [],
            items: [],
            message: error.message
          };
        }
      }
    );

    return {
      success: response.success,
      feeds: response.feeds,
      items: response.items,
      message: response.message
    };
  }

  /**
   * Fetches reader view from the worker
   */
  async fetchReaderView(url: string): Promise<{
    success: boolean;
    data: ReaderViewResponse[];
    message?: string;
  }> {
    const apiConfig = getApiConfig();

    const response = await this.sendWorkerMessage<Extract<WorkerResponse, { type: 'READER_VIEW_RESULT' }>>(
      'rss',
      {
        type: 'FETCH_READER_VIEW',
        payload: {
          urls: [url],
          apiBaseUrl: apiConfig.baseUrl
        }
      },
      'READER_VIEW_RESULT',
      async () => {
        Logger.debug('[WorkerService] Using fallback fetcher for reader view');
        try {
          const data = await this.fallbackFetcher.fetchReaderView([url]);
          return { success: true, data };
        } catch (error: any) {
          return {
            success: false,
            data: [],
            message: error.message
          };
        }
      }
    );

    return {
      success: response.success,
      data: response.data,
      message: response.message
    };
  }

  /**
   * Generates card shadows in the worker
   */
  async generateShadows(id: string, color: { r: number, g: number, b: number }, isDarkMode: boolean): Promise<{
    restShadow: string,
    hoverShadow: string,
    pressedShadow: string
  }> {
    const response = await this.sendWorkerMessage<Extract<WorkerResponse, { type: 'SHADOWS_RESULT' }>>(
      'shadow',
      {
        type: 'GENERATE_SHADOWS',
        payload: { id, color, isDarkMode }
      },
      'SHADOWS_RESULT',
      async () => {
        const { generateCardShadows } = await import('../utils/shadow');
        return generateCardShadows(color, isDarkMode);
      },
      (response) => response.payload.id === id
    );

    return response.payload.shadows;
  }

  /**
   * Checks for updates without refreshing the store
   */
  async checkForUpdates(urls: string[]): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    const apiConfig = getApiConfig();

    const response = await this.sendWorkerMessage<Extract<WorkerResponse, { type: 'FEEDS_RESULT' }>>(
      'rss',
      {
        type: 'CHECK_UPDATES',
        payload: {
          urls,
          apiBaseUrl: apiConfig.baseUrl
        }
      },
      'FEEDS_RESULT',
      async () => {
        Logger.debug('[WorkerService] Using fallback fetcher for updates');
        try {
          const result = await this.fallbackFetcher.fetchFeeds(urls);
          return { success: true, ...result };
        } catch (error: any) {
          return {
            success: false,
            feeds: [],
            items: [],
            message: error.message
          };
        }
      }
    );

    return {
      success: response.success,
      feeds: response.feeds,
      items: response.items,
      message: response.message
    };
  }

  /**
   * Terminates the worker
   */
  terminate(): void {
    if (this.rssWorker) {
      this.rssWorker.terminate();
      this.rssWorker = null;
    }
    if (this.shadowWorker) {
      this.shadowWorker.terminate();
      this.shadowWorker = null;
    }
    this.messageHandlers.clear();
    this.isInitialized = false;
    Logger.debug('WorkerService: Workers terminated');
  }
}

// Export singleton instance with default fetcher
const workerServiceInstance = new WorkerService();
export const workerService = workerServiceInstance;

// Also export class for testing with custom fetcher
export { WorkerService };