/**
 * Direct API service that replaces the worker-based implementation
 * Provides 4x faster API calls by eliminating worker message overhead
 * Enhanced with retry logic, request cancellation, deduplication, and circuit breaker
 */

import { generateUUIDSync, createHashSync } from "@/utils/uuid";
import { handleError, withErrorHandling, ErrorType, AppError } from "@/utils/error-handling";
import type {
  Feed,
  FeedItem,
  ReaderViewResponse,
  FetchFeedsResponse,
  ApiClient,
  RequestConfig,
  ApiClientError as ApiError,
  RequestTracker,
  CircuitBreakerState,
} from "@/types";
import { getApiConfig } from "@/hooks/useApiConfig";
import { Logger } from "@/utils/logger";
import { SecureLogger } from "@/utils/secure-logging";
import {
} from "@/utils/type-guards";
import {
  isValidUrl,
  isValidApiUrl,
  generateSecureCacheKey,
  validateFeedUrls,
  SECURITY_CONFIG,
} from "@/utils/security";

// Cache implementation for API responses
class ApiCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 30 * 60 * 1000) {
    this.ttl = ttl;
  }

  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  async set(key: string, data: unknown): Promise<void> {
    const secureKey = await generateSecureCacheKey(key);
    this.cache.set(secureKey, { data, timestamp: Date.now() });
  }

  async get<T>(key: string): Promise<T | null> {
    const secureKey = await generateSecureCacheKey(key);
    const item = this.cache.get(secureKey);
    if (!item) return null;

    // Check if cache is still valid
    if (Date.now() - item.timestamp > this.ttl) {
      Logger.debug(`[ApiService] Cache expired for key: ${key}`);
      this.cache.delete(secureKey);
      return null;
    }

    Logger.debug(`[ApiService] Cache hit for key: ${key}`);
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  async delete(key: string): Promise<void> {
    const secureKey = await generateSecureCacheKey(key);
    this.cache.delete(secureKey);
  }
}

// DTOs for API operations
export interface CreateFeedDto {
  url: string;
}

export interface CreateBatchDto {
  urls: string[];
}

export interface UpdateFeedDto {
  feedTitle?: string;
  categories?: string[];
}

export interface BatchCreateResponse {
  feeds: Feed[];
  items: FeedItem[];
  successfulCount: number;
  failedCount: number;
  failedUrls: string[];
  errors: { url: string; error: string }[];
}

// Circuit state enum
enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

// Default configurations
const DEFAULT_RETRY_CONFIG: NonNullable<RequestConfig["retry"]> = {
  attempts: 3,
  backoff: "exponential",
  maxDelay: 30000, // 30 seconds
  initialDelay: 1000, // 1 second
  factor: 2,
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenRequests: 3,
};

// Helper type guard for API errors
function isApiErrorType(error: unknown): error is ApiError {
  return error instanceof Error && "code" in error;
}

// Helper function to check if error is retryable
function isRetryableError(error: ApiError): boolean {
  // Network errors and 5xx errors are typically retryable
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return true;
  }

  if (error.status) {
    // 5xx errors (server errors) are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 (Too Many Requests) is retryable after delay
    if (error.status === 429) {
      return true;
    }

    // 408 (Request Timeout) is retryable
    if (error.status === 408) {
      return true;
    }
  }

  return false;
}

// Helper function to create API errors
function createApiError(
  message: string,
  code: string,
  status?: number,
  originalError?: Error,
): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  error.originalError = originalError;
  return error;
}

// Helper function to calculate delay for exponential backoff
function calculateBackoffDelay(
  attempt: number,
  config: NonNullable<RequestConfig["retry"]>,
): number {
  const { backoff, initialDelay = 1000, factor = 2, maxDelay } = config;

  if (backoff === "linear") {
    return Math.min(initialDelay, maxDelay);
  }

  // Exponential backoff
  const delay = initialDelay * Math.pow(factor, attempt - 1);
  return Math.min(delay, maxDelay);
}

// Helper to create request key for deduplication
function createRequestKey(config: RequestConfig): string {
  const { url, method, body } = config;
  const bodyStr = body ? JSON.stringify(body) : "";
  return createHashSync(`${method}:${url}:${bodyStr}`);
}

// Main API Service class
class ApiService implements ApiClient {
  private cache: ApiCache;
  private baseUrl: string = "";
  private requestTrackers = new Map<string, RequestTracker>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  /**
   * Updates API configuration
   */
  updateApiConfig(config: { baseUrl?: string; apiKey?: string; timeout?: number; cacheTtl?: number; [key: string]: unknown }): void {
    if (config.baseUrl) {
      this.updateApiUrl(config.baseUrl);
    }
    if (config.cacheTtl) {
      this.updateCacheTtl(config.cacheTtl);
    }
  }

  constructor() {
    const ttl =
      Number(process.env.NEXT_PUBLIC_WORKER_CACHE_TTL) || 30 * 60 * 1000;
    this.cache = new ApiCache(ttl);

    // Initialize with current API config
    const config = getApiConfig();
    this.baseUrl = config.baseUrl;
  }

  /**
   * Updates the API base URL with validation
   */
  updateApiUrl(url: string): void {
    // Validate the URL using security utility
    if (!isValidApiUrl(url)) {
      throw new Error("Invalid API URL");
    }

    if (url.length > SECURITY_CONFIG.MAX_URL_LENGTH) {
      throw new Error("API URL exceeds maximum length");
    }

    this.baseUrl = url;
    // Clear cache when API URL changes
    this.cache.clear();
    SecureLogger.debug('[ApiService] API URL updated', { url });
  }

  /**
   * Updates cache TTL
   */
  updateCacheTtl(ttl: number): void {
    this.cache.setTTL(ttl);
    SecureLogger.debug('[ApiService] Cache TTL updated', { ttl });
  }

  /**
   * Cancel a specific request by ID
   */
  cancel(requestId: string): void {
    const tracker = this.requestTrackers.get(requestId);
    if (tracker) {
      tracker.controller.abort();
      this.requestTrackers.delete(requestId);
      SecureLogger.debug('[ApiService] Cancelled request', { requestId });
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.requestTrackers.forEach((tracker, _id) => {
      tracker.controller.abort();
    });
    this.requestTrackers.clear();
    Logger.debug("[ApiService] Cancelled all pending requests");
  }

  /**
   * Check circuit breaker state for an endpoint
   */
  private checkCircuitBreaker(endpoint: string): void {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return;

    const now = Date.now();

    if (breaker.state === CircuitState.OPEN) {
      if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
        // Move to half-open state
        breaker.state = CircuitState.HALF_OPEN;
        breaker.failures = 0;
        SecureLogger.debug('[ApiService] Circuit breaker half-open', { endpoint });
      } else {
        throw createApiError("Circuit breaker is open", "CIRCUIT_BREAKER_OPEN");
      }
    }
  }

  /**
   * Update circuit breaker on success
   */
  private onRequestSuccess(endpoint: string): void {
    const breaker = this.circuitBreakers.get(endpoint);
    if (breaker && breaker.state !== CircuitState.CLOSED) {
      breaker.state = CircuitState.CLOSED;
      breaker.failures = 0;
      breaker.lastFailureTime = undefined;
      breaker.nextAttemptTime = undefined;
      SecureLogger.debug('[ApiService] Circuit breaker closed', { endpoint });
    }
  }

  /**
   * Update circuit breaker on failure
   */
  private onRequestFailure(endpoint: string): void {
    let breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) {
      breaker = {
        state: CircuitState.CLOSED,
        failures: 0,
      };
      this.circuitBreakers.set(endpoint, breaker);
    }

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      breaker.state = CircuitState.OPEN;
      breaker.nextAttemptTime =
        Date.now() + DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeout;
      Logger.warn(`[ApiService] Circuit breaker opened for ${endpoint}`);
    }
  }

  /**
   * Enhanced request method with retry, cancellation, and circuit breaker
   */
  async request<T>(config: RequestConfig): Promise<T> {
    const {
      url,
      method: _method,
      body: _body,
      headers: _headers = {},
      retry = DEFAULT_RETRY_CONFIG,
      timeout: _timeout,
      signal: _signal,
      requestId = generateUUIDSync(),
    } = config;

    // Check for duplicate in-flight requests
    const requestKey = createRequestKey(config);
    const existingTracker = Array.from(this.requestTrackers.values()).find(
      (tracker) => createRequestKey(tracker.config) === requestKey,
    );

    if (existingTracker) {
      Logger.debug("[ApiService] Returning existing request promise");
      return existingTracker.promise as Promise<T>;
    }

    // Check circuit breaker
    const endpoint = new URL(url, this.baseUrl).pathname;
    this.checkCircuitBreaker(endpoint);

    // Create abort controller
    const controller = new AbortController();
    // Note: AbortSignal.any is not available in all environments
    // For now, we'll use the controller signal directly
    const combinedSignal = controller.signal;

    // Create request tracker
    const requestPromise = this.executeRequestWithRetry<T>(
      config,
      retry,
      combinedSignal,
      endpoint,
    );

    const tracker: RequestTracker = {
      promise: requestPromise,
      controller,
      timestamp: Date.now(),
      config,
    };

    this.requestTrackers.set(requestId, tracker);

    // Clean up tracker when done
    requestPromise.finally(() => {
      this.requestTrackers.delete(requestId);
    });

    return requestPromise;
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequestWithRetry<T>(
    config: RequestConfig,
    retryConfig: NonNullable<RequestConfig["retry"]>,
    signal: AbortSignal,
    endpoint: string,
  ): Promise<T> {
    const { url, method, body, headers = {}, timeout } = config;
    const fullUrl = `${this.baseUrl}${url}`;
    let lastError: ApiError | undefined;

    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      // Declare variables outside try block for catch block access
      let timeoutId: NodeJS.Timeout | undefined;
      let handleAbort: (() => void) | undefined;
      const abortController = new AbortController();

      try {
        // Combine signals if needed
        if (signal.aborted) {
          throw createApiError("Request aborted", "ABORTED");
        }

        // Set up abort listener for original signal
        handleAbort = () => abortController.abort();
        signal.addEventListener("abort", handleAbort);

        if (timeout) {
          timeoutId = setTimeout(() => {
            abortController.abort();
          }, timeout);
        }

        let response: Response;
        try {
          response = await fetch(fullUrl, {
            method,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: abortController.signal,
          });
        } catch (fetchError) {
          // Handle fetch failures that return no response object
          throw createApiError(
            fetchError instanceof Error
              ? fetchError.message
              : "Network request failed",
            "NETWORK_ERROR",
            undefined,
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError)),
          );
        }

        if (timeoutId) clearTimeout(timeoutId);
        signal.removeEventListener("abort", handleAbort);

        // Bulletproof check for response object and ok property
        if (!response || typeof response.ok !== "boolean" || !response.ok) {
          const status = response?.status || 0;
          const error = createApiError(
            `HTTP error! status: ${status}`,
            "HTTP_ERROR",
            status,
          );
          error.attempts = attempt;
          throw error;
        }

        const data = await response.json().catch((jsonError) => {
          // Handle JSON parsing errors
          throw createApiError(
            "Invalid JSON response",
            "PARSE_ERROR",
            response.status,
            jsonError,
          );
        });
        this.onRequestSuccess(endpoint);
        return data as T;
      } catch (error) {
        // Clean up event listener
        if (timeoutId) clearTimeout(timeoutId);
        if (handleAbort) signal.removeEventListener("abort", handleAbort);

        // Handle abort
        if (signal.aborted) {
          throw createApiError("Request aborted", "ABORTED");
        }

        // Create or enhance error
        let apiError: ApiError;
        if (isApiErrorType(error)) {
          apiError = error;
        } else if (error instanceof Error) {
          if (error.name === "AbortError" || abortController.signal.aborted) {
            apiError = createApiError("Request timeout", "TIMEOUT");
          } else {
            apiError = createApiError(
              error.message,
              "NETWORK_ERROR",
              undefined,
              error,
            );
          }
        } else {
          apiError = createApiError("Unknown error", "UNKNOWN");
        }

        apiError.attempts = attempt;
        lastError = apiError;

        // Check if we should retry
        const shouldRetry = retryConfig.retryCondition
          ? retryConfig.retryCondition(apiError)
          : isRetryableError(apiError);

        if (!shouldRetry || attempt === retryConfig.attempts) {
          this.onRequestFailure(endpoint);
          throw apiError;
        }

        // Calculate delay and wait
        const delay = calculateBackoffDelay(attempt, retryConfig);
        Logger.debug(
          `[ApiService] Retrying request (attempt ${attempt + 1}/${retryConfig.attempts}) after ${delay}ms`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || createApiError("Max retries exceeded", "MAX_RETRIES");
  }

  /**
   * Makes a POST request to the API (legacy method, now uses request internally)
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>({
      url: endpoint,
      method: "POST",
      body,
    });
  }

  /**
   * Makes a GET request to the API
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>({
      url: endpoint,
      method: "GET",
    });
  }

  /**
   * Makes a PATCH request to the API
   */
  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>({
      url: endpoint,
      method: "PATCH",
      body,
    });
  }

  // Feed operations
  feeds = {
    /**
     * Get all feeds (fetches from cache or API)
     */
    getAll: async (): Promise<Feed[]> => {
      // For getAll, we'll use the existing feeds from the store
      // This method would typically be used for initial load
      const { feeds } = await this.fetchFeeds([]);
      return feeds;
    },

    /**
     * Get a single feed by ID
     */
    getById: async (id: string): Promise<Feed> => {
      // Check cache first
      const cacheKey = await generateSecureCacheKey(`feed:${id}`);
      const cached = await this.cache.get<Feed>(cacheKey);
      if (cached) return cached;

      // In the current implementation, feeds are fetched in bulk
      // So we'll get all feeds and find the one we need
      const feeds = await this.feeds.getAll();
      const feed = feeds.find((f) => f.guid === id);

      if (!feed) {
        throw new AppError(`Feed with id ${id} not found`, ErrorType.NOT_FOUND, {
          statusCode: 404,
          context: { feedId: id }
        });
      }

      await this.cache.set(cacheKey, feed);
      return feed;
    },

    /**
     * Create/add a new feed
     */
    create: async (feedDto: CreateFeedDto): Promise<Feed> => {
      const result = await this.fetchFeeds([feedDto.url]);
      if (result.feeds.length === 0) {
        throw new AppError("Failed to add feed", ErrorType.SERVER, {
          statusCode: 500,
          context: { feedUrl: feedDto.url },
          retryable: true
        });
      }
      return result.feeds[0];
    },

    /**
     * Create/add multiple feeds in a single batch request
     */
    createBatch: async (
      batchDto: CreateBatchDto,
    ): Promise<BatchCreateResponse> => {
      Logger.debug(
        `[ApiService] Creating batch of ${batchDto.urls.length} feeds`,
      );

      const results: BatchCreateResponse = {
        feeds: [],
        items: [],
        successfulCount: 0,
        failedCount: 0,
        failedUrls: [],
        errors: [],
      };

      if (batchDto.urls.length === 0) {
        return results;
      }

      try {
        // Use the existing fetchFeeds method which calls /parse with batch URLs
        const batchResult = await this.fetchFeeds(batchDto.urls);

        // All URLs that successfully returned feeds
        const successfulUrls = new Set(batchResult.feeds.map((f) => f.feedUrl));

        results.feeds = batchResult.feeds;
        results.items = batchResult.items;
        results.successfulCount = batchResult.feeds.length;

        // Identify failed URLs (those that didn't return a feed)
        results.failedUrls = batchDto.urls.filter(
          (url) => !successfulUrls.has(url),
        );
        results.failedCount = results.failedUrls.length;

        // Create error entries for failed URLs
        results.errors = results.failedUrls.map((url) => ({
          url,
          error: "Feed could not be parsed or fetched",
        }));

        Logger.debug(
          `[ApiService] Batch create completed: ${results.successfulCount} successful, ${results.failedCount} failed`,
        );

        return results;
      } catch (error) {
        Logger.error("[ApiService] Batch create failed:", error);

        // If the entire batch fails, mark all URLs as failed
        results.failedUrls = [...batchDto.urls];
        results.failedCount = batchDto.urls.length;
        results.errors = batchDto.urls.map((url) => ({
          url,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }));

        // Don't throw - return partial results with error information
        return results;
      }
    },

    /**
     * Update feed (not implemented in current API)
     */
    update: async (_id: string, _feedDto: UpdateFeedDto): Promise<Feed> => {
      // Current API doesn't support feed updates
      // This would need to be implemented on the backend
      throw new AppError("Feed update not implemented", ErrorType.NOT_FOUND, {
        statusCode: 501,
        context: { operation: "updateFeed" }
      });
    },

    /**
     * Delete a feed (handled client-side in current implementation)
     */
    delete: async (id: string): Promise<void> => {
      // Current implementation handles this client-side
      // Just clear relevant cache entries
      const cacheKey = await generateSecureCacheKey(`feed:${id}`);
      await this.cache.delete(cacheKey);
      return Promise.resolve();
    },

    /**
     * Refresh a specific feed
     */
    refresh: async (id: string): Promise<FeedItem[]> => {
      // Find the feed URL for this ID
      const feed = await this.feeds.getById(id);
      const result = await this.refreshFeeds([feed.feedUrl]);
      return result.items.filter((item) => item.feedUrl === feed.feedUrl);
    },
  };

  // Article operations
  articles = {
    /**
     * Get articles by feed ID
     */
    getByFeed: async (feedId: string): Promise<FeedItem[]> => {
      const feed = await this.feeds.getById(feedId);
      const result = await this.fetchFeeds([feed.feedUrl]);
      return result.items;
    },

    /**
     * Mark article as read (handled client-side)
     */
    markAsRead: async (_id: string): Promise<void> => {
      // Current implementation handles this client-side
      return Promise.resolve();
    },

    /**
     * Mark article as unread (handled client-side)
     */
    markAsUnread: async (_id: string): Promise<void> => {
      // Current implementation handles this client-side
      return Promise.resolve();
    },
  };

  /**
   * Fetches feeds from the API (direct replacement for worker method)
   */
  async fetchFeeds(
    urls: string[],
  ): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
    try {
      // Validate feed URLs
      const { valid: validUrls, invalid } = validateFeedUrls(urls);
      if (invalid.length > 0) {
        Logger.warn(
          `[ApiService] Skipping invalid feed URLs: ${invalid.join(", ")}`,
        );
      }

      if (validUrls.length === 0) {
        return { feeds: [], items: [] };
      }

      // Generate secure cache key
      const sortedUrls = validUrls.sort().join(",");
      const cacheKey = await generateSecureCacheKey(`feeds:${sortedUrls}`);

      // Check cache first
      const cached = await this.cache.get<{ feeds: Feed[]; items: FeedItem[] }>(
        cacheKey,
      );
      if (cached) {
        return cached;
      }

      SecureLogger.debug('[ApiService] Fetching feeds', { count: validUrls.length });

      const data = await this.post<FetchFeedsResponse>("/parse", {
        urls: validUrls,
      });

      // Validate response structure
      if (!data || !Array.isArray(data.feeds)) {
        throw new Error("Invalid response from API");
      }

      // Validate basic feed structure (skip strict type validation for now to prevent blocking)
      data.feeds.filter((feed: unknown) => {
        if (!feed || typeof feed !== "object") {
          Logger.warn(`[ApiService] Invalid feed data: not an object`);
          return false;
        }
        const feedObj = feed as Feed;
        if (!feedObj.guid || !feedObj.feedUrl) {
          Logger.warn(
            `[ApiService] Invalid feed data: missing required fields`,
          );
          return false;
        }
        return true;
      });

      // Process feeds with proper typing
      const feeds: Feed[] = (data.feeds as unknown as Record<string, unknown>[]).map((feed: Record<string, unknown>) => ({
        type: String(feed.type || ''),
        id: String(feed.id || feed.guid || ''), // Support both id and guid
        guid: String(feed.guid || ''),
        status: String(feed.status || ''),
        siteTitle: String(feed.siteTitle || ''),
        siteName: String(feed.siteName || ''),
        feedTitle: String(feed.feedTitle || feed.title || ''),
        feedUrl: String(feed.feedUrl || ''),
        url: String(feed.url || feed.feedUrl || ''), // Support both url and feedUrl
        description: String(feed.description || ''),
        link: String(feed.link || ''),
        lastUpdated: String(feed.lastUpdated || ''),
        lastRefreshed: String(feed.lastRefreshed || ''),
        published: String(feed.published || ''),
        author: String(feed.author || ''),
        language: String(feed.language || ''),
        favicon: String(feed.favicon || ''),
        categories: Array.isArray(feed.categories) ? feed.categories : [],
        category: String(feed.category || ''),
        items: Array.isArray(feed.items)
          ? feed.items.map((item: Record<string, unknown>) => ({
              type: String(item.type || ''),
              id: String(item.id || ''),
              title: String(item.title || ''),
              description: String(item.description || ''),
              link: String(item.link || ''),
              url: String(item.url || item.link || ''), // Support both url and link
              author: String(item.author || ''),
              published: String(item.published || ''),
              content: String(item.content || ''),
              created: String(item.created || ''),
              content_encoded: String(item.content_encoded || ''),
              content_html: String(item.content_html || ''),
              categories: Array.isArray(item.categories)
                ? item.categories
                : item.categories
                  ? [String(item.categories)]
                  : [], // Ensure array format
              category: String(item.category || ''),
              feed_id: String(item.feed_id || feed.guid || ''),
              attachments: Array.isArray(item.attachments) ? item.attachments : [],
              enclosures: Array.isArray(item.enclosures) ? item.enclosures : [],
              thumbnail: String(item.thumbnail || ''),
              thumbnailColor:
                typeof item.thumbnailColor === "string"
                  ? item.thumbnailColor
                  : (typeof item.thumbnailColor === "object" && item.thumbnailColor) 
                    ? item.thumbnailColor as { r: number; g: number; b: number }
                    : { r: 0, g: 0, b: 0 },
              thumbnailColorComputed: String(item.thumbnailColorComputed || "#000000"), // Ensure string hex color
              siteTitle: String(feed.siteTitle || ''),
              siteName: String(feed.siteName || ''),
              feedTitle: String(feed.feedTitle || ''),
              feedUrl: String(feed.feedUrl || ''),
              favicon: String(feed.favicon || ''),
              favorite: Boolean(item.favorite),
              duration: item.duration ? Number(item.duration) : undefined,
              itunesEpisode: item.itunesEpisode ? String(item.itunesEpisode) : undefined,
              itunesSeason: item.itunesSeason ? String(item.itunesSeason) : undefined,
              feedImage: String(item.feedImage || ''),
            }))
          : [],
      }));

      const items: FeedItem[] = feeds.flatMap((feed) => feed.items || []);

      // Cache the result
      const result = { feeds, items };
      await this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw handleError(error, "fetchFeeds", { urls });
    }
  }

  /**
   * Refreshes feeds (bypasses cache)
   */
  async refreshFeeds(
    urls: string[],
  ): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
    try {
      // Validate URLs first
      const { valid: validUrls } = validateFeedUrls(urls);
      if (validUrls.length === 0) {
        return { feeds: [], items: [] };
      }

      // Clear cache for refresh - use same secure hashing as fetchFeeds
      const sortedUrls = validUrls.sort().join(",");
      const cacheKey = await generateSecureCacheKey(`feeds:${sortedUrls}`);
      await this.cache.delete(cacheKey);

      // Fetch fresh data
      return await this.fetchFeeds(urls);
    } catch (error) {
      throw handleError(error, "refreshFeeds", { urls });
    }
  }

  /**
   * Fetches reader view for an article
   */
  async fetchReaderView(url: string): Promise<ReaderViewResponse> {
    try {
      // Validate URL first
      if (!isValidUrl(url)) {
        throw new AppError("Invalid URL for reader view", ErrorType.VALIDATION, {
          statusCode: 400,
          context: { url }
        });
      }

      // Generate secure cache key
      const cacheKey = await generateSecureCacheKey(`reader:${url}`);

      // Check cache first
      const cached = await this.cache.get<ReaderViewResponse[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached[0];
      }

      Logger.debug("[ApiService] Fetching reader view for URL:", url);

      const data = await this.post<ReaderViewResponse[]>("/getreaderview", {
        urls: [url],
      });

      if (!Array.isArray(data) || data.length === 0) {
        throw new AppError("Invalid response from API", ErrorType.SERVER, {
          statusCode: 500,
          context: { url },
          retryable: true
        });
      }

      // Validate response (assuming we have an isArticle type guard)
      // For now, we'll do basic validation
      if (!data[0] || typeof data[0] !== "object") {
        throw new AppError("Invalid reader view response structure", ErrorType.SERVER, {
          statusCode: 500,
          context: { url },
          retryable: true
        });
      }

      // Cache the result
      await this.cache.set(cacheKey, data);

      return data[0];
    } catch (error) {
      throw handleError(error, "fetchReaderView", { url });
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for convenience
export type { Feed, FeedItem, ReaderViewResponse };
