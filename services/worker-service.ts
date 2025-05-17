// services/worker-service.ts
import type { Feed, FeedItem, ReaderViewResponse } from '../types';
import { generateCardShadows } from '../utils/shadow';
import { getApiConfig } from '@/store/useApiConfigStore';

const isClient = typeof window !== 'undefined'

const DEFAULT_CACHE_TTL = (() => {
  const ttl = Number(process.env.NEXT_PUBLIC_WORKER_CACHE_TTL);
  return Number.isFinite(ttl) ? ttl : 30 * 60 * 1000; // 30 minutes
})();

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
  private cacheTtl = DEFAULT_CACHE_TTL;

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
      console.log('WorkerService: Workers initialized');
    } catch (error) {
      console.error('WorkerService: Failed to initialize workers', error);
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
      console.error('WorkerService: Error from worker', response.message);
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
      console.error('WorkerService: Workers not initialized');
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
   * Fetches feeds from the worker
   */
  async fetchFeeds(url: string): Promise<{ 
    success: boolean; 
    feeds: Feed[]; 
    items: FeedItem[];
    message?: string; 
  }> {
    const apiConfig = getApiConfig();
    return new Promise(resolve => {
      // Initialize if not already
      if (!this.isInitialized) this.initialize();
      
      // If no worker, fall back to direct API call
      if (!this.rssWorker) {
        console.warn('WorkerService: Worker not available, using fallback');
        import('../lib/rss').then(({ fetchFeeds }) => {
          fetchFeeds([url])
            .then(result => resolve({ success: true, ...result }))
            .catch(error => resolve({ 
              success: false, 
              feeds: [], 
              items: [], 
              message: error.message 
            }));
        });
        return;
      }

      // Register one-time handler for response
      const unsubscribe = this.onMessage('FEEDS_RESULT', (response) => {
        unsubscribe();
        resolve({
          success: response.success,
          feeds: response.feeds,
          items: response.items,
          message: response.message
        });
      });
      
      // Send message to worker
      this.postMessage({
        type: 'FETCH_FEEDS',
        payload: { 
          urls: [url],
          apiBaseUrl: apiConfig.baseUrl
        }
      });
    });
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
    return new Promise(resolve => {
      // Initialize if not already
      if (!this.isInitialized) this.initialize();
      
      // If no worker, fall back to direct API call
      if (!this.rssWorker) {
        console.warn('WorkerService: Worker not available, using fallback');
        import('../lib/rss').then(({ fetchFeeds }) => {
          fetchFeeds(urls)
            .then(result => resolve({ success: true, ...result }))
            .catch(error => resolve({ 
              success: false, 
              feeds: [], 
              items: [], 
              message: error.message 
            }));
        });
        return;
      }

      // Register one-time handler for response
      const unsubscribe = this.onMessage('FEEDS_RESULT', (response) => {
        unsubscribe();
        resolve({
          success: response.success,
          feeds: response.feeds,
          items: response.items,
          message: response.message
        });
      });
      
      // Send message to worker
      this.postMessage({
        type: 'REFRESH_FEEDS',
        payload: { 
          urls,
          apiBaseUrl: apiConfig.baseUrl 
        }
      });
    });
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
    return new Promise(resolve => {
      // Initialize if not already
      if (!this.isInitialized) this.initialize();
      
      // If no worker, fall back to direct API call
      if (!this.rssWorker) {
        console.warn('WorkerService: Worker not available, using fallback');
        import('../lib/rss').then(({ fetchReaderView }) => {
          fetchReaderView([url])
            .then(data => resolve({ success: true, data }))
            .catch(error => resolve({ 
              success: false, 
              data: [], 
              message: error.message 
            }));
        });
        return;
      }

      // Register one-time handler for response
      const unsubscribe = this.onMessage('READER_VIEW_RESULT', (response) => {
        unsubscribe();
        resolve({
          success: response.success,
          data: response.data,
          message: response.message
        });
      });
      
      // Send message to worker
      this.postMessage({
        type: 'FETCH_READER_VIEW',
        payload: { 
          urls: [url],
          apiBaseUrl: apiConfig.baseUrl
        }
      });
    });
  }

  /**
   * Generates card shadows in the worker
   */
  async generateShadows(id: string, color: { r: number, g: number, b: number }, isDarkMode: boolean): Promise<{
    restShadow: string,
    hoverShadow: string,
    pressedShadow: string
  }> {
    return new Promise(resolve => {
      if (!this.isInitialized) this.initialize();

      if (!this.shadowWorker) {
        console.warn('WorkerService: Worker not available, using fallback');
        import('../utils/shadow').then(({ generateCardShadows }) => {
          resolve(generateCardShadows(color, isDarkMode));
        });
        return;
      }

      const unsubscribe = this.onMessage('SHADOWS_RESULT', (response) => {
        if (response.payload.id === id) {
          unsubscribe();
          resolve(response.payload.shadows);
        }
      });

      this.postMessage({
        type: 'GENERATE_SHADOWS',
        payload: { id, color, isDarkMode }
      });
    });
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
    return new Promise(resolve => {
      if (!this.isInitialized) this.initialize();
      
      if (!this.rssWorker) {
        console.warn('WorkerService: Worker not available, using fallback');
        import('../lib/rss').then(({ fetchFeeds }) => {
          fetchFeeds(urls)
            .then(result => resolve({ success: true, ...result }))
            .catch(error => resolve({ 
              success: false, 
              feeds: [], 
              items: [], 
              message: error.message 
            }));
        });
        return;
      }

      const unsubscribe = this.onMessage('FEEDS_RESULT', (response) => {
        unsubscribe();
        resolve({
          success: response.success,
          feeds: response.feeds,
          items: response.items,
          message: response.message
        });
      });
      
      this.postMessage({
        type: 'CHECK_UPDATES',
        payload: { 
          urls,
          apiBaseUrl: apiConfig.baseUrl
        }
      });
    });
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
    console.log('WorkerService: Workers terminated');
  }
}

// Export singleton instance
export const workerService = new WorkerService();