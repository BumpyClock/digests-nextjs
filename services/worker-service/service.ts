import { DEFAULT_API_CONFIG, DEFAULT_CACHE_TTL_MS } from "@/lib/config";
import { createFeedFetcher } from "@/lib/feed-fetcher";
import type { IFeedFetcher } from "@/lib/interfaces/feed-fetcher.interface";
import { Logger } from "@/utils/logger";
import type { Feed, FeedItem, ReaderViewResponse } from "@/types";
import { sendWorkerRequest } from "./transport";
import type { WorkerKind, WorkerMessage, WorkerResponse } from "./types";

const isClient = typeof window !== "undefined";

/**
 * A service that manages the RSS and shadow workers.
 */
class WorkerService {
  private rssWorker: Worker | null = null;
  private shadowWorker: Worker | null = null;
  private messageHandlers: Map<WorkerResponse["type"], Set<(data: WorkerResponse) => void>> =
    new Map();
  private isInitialized = false;
  private cacheTtl = DEFAULT_CACHE_TTL_MS;
  private apiBaseUrl: string;
  private shadowCache = new Map<
    string,
    { restShadow: string; hoverShadow: string; pressedShadow: string }
  >();
  private requestCounter = 0;
  private readonly WORKER_TIMEOUT_MS = 30000;
  private fallbackFetcher: IFeedFetcher;

  constructor(options?: { fallbackFetcher?: IFeedFetcher; initialApiBaseUrl?: string }) {
    this.fallbackFetcher = options?.fallbackFetcher ?? createFeedFetcher();
    this.apiBaseUrl = options?.initialApiBaseUrl ?? DEFAULT_API_CONFIG.baseUrl;
  }

  initialize(): void {
    if (this.isInitialized || !isClient) return;

    try {
      this.rssWorker = new Worker(new URL("../../workers/rss-worker.ts", import.meta.url), {
        type: "module",
      });
      this.shadowWorker = new Worker(new URL("../../workers/shadow-worker.ts", import.meta.url), {
        type: "module",
      });

      this.attachWorkerHandlers();
      this.syncWorkerRuntimeConfig();

      this.isInitialized = true;
      Logger.debug("WorkerService: Workers initialized");
    } catch (error) {
      this.terminate();
      Logger.error(
        "WorkerService: Failed to initialize workers",
        error instanceof Error ? error : undefined
      );
    }
  }

  start(): void {
    this.initialize();
  }

  stop(): void {
    this.terminate();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initialize();
    }
  }

  private syncWorkerRuntimeConfig(): void {
    if (!this.rssWorker) {
      return;
    }

    this.rssWorker.postMessage({
      type: "SET_API_URL",
      payload: { url: this.apiBaseUrl },
    });
    this.rssWorker.postMessage({
      type: "SET_CACHE_TTL",
      payload: { ttl: this.cacheTtl },
    });
  }

  private attachWorkerHandlers(): void {
    if (this.rssWorker) {
      this.rssWorker.addEventListener("message", this.handleWorkerMessage);
    }
    if (this.shadowWorker) {
      this.shadowWorker.addEventListener("message", this.handleWorkerMessage);
    }
  }

  private detachWorkerHandlers(): void {
    if (this.rssWorker) {
      this.rssWorker.removeEventListener("message", this.handleWorkerMessage);
    }
    if (this.shadowWorker) {
      this.shadowWorker.removeEventListener("message", this.handleWorkerMessage);
    }
  }

  updateApiUrl(url: string): void {
    this.apiBaseUrl = url;
    this.ensureInitialized();

    if (this.rssWorker) {
      this.rssWorker.postMessage({
        type: "SET_API_URL",
        payload: { url },
      });
    }
  }

  updateCacheTtl(ttl: number): void {
    this.cacheTtl = ttl;
    this.ensureInitialized();

    if (this.rssWorker) {
      this.rssWorker.postMessage({
        type: "SET_CACHE_TTL",
        payload: { ttl },
      });
    }
  }

  private handleWorkerMessage = (event: MessageEvent): void => {
    const response = event.data as WorkerResponse;

    if (response.type === "ERROR") {
      Logger.error(`WorkerService: Error from worker - ${response.message}`);
    }

    const handlers = this.messageHandlers.get(response.type);
    if (handlers) {
      handlers.forEach((handler) => handler(response));
    }
  };

  onMessage<T extends WorkerResponse["type"]>(
    type: T,
    handler: (data: Extract<WorkerResponse, { type: T }>) => void
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const wrappedHandler = (data: WorkerResponse) => {
      if (data.type === type) {
        handler(data as Extract<WorkerResponse, { type: T }>);
      }
    };

    this.messageHandlers.get(type)?.add(wrappedHandler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(wrappedHandler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  postMessage(message: WorkerMessage): void {
    this.ensureInitialized();

    const worker = message.type === "GENERATE_SHADOWS" ? this.shadowWorker : this.rssWorker;
    if (!worker) {
      Logger.error("WorkerService: Workers not initialized");
      return;
    }

    worker.postMessage(message);
  }

  private createRequestId(): string {
    return `${++this.requestCounter}-${Date.now()}`;
  }

  private sendWorkerMessage(
    worker: WorkerKind,
    message: WorkerMessage,
    expectedResponseType: WorkerResponse["type"],
    fallbackFn?: () => Promise<WorkerResponse>,
    responseFilter?: (response: WorkerResponse) => boolean
  ): Promise<WorkerResponse> {
    return sendWorkerRequest({
      worker,
      message,
      expectedResponseType,
      timeoutMs: this.WORKER_TIMEOUT_MS,
      ensureInitialized: () => this.ensureInitialized(),
      getWorker: (workerKind) => (workerKind === "rss" ? this.rssWorker : this.shadowWorker),
      postMessage: (messageToPost) => this.postMessage(messageToPost),
      onMessage: (type, handler) => this.onMessage(type, handler),
      createRequestId: () => this.createRequestId(),
      fallbackFn,
      responseFilter,
    });
  }

  private async sendFeedsRequest({
    type,
    urls,
    fallbackLabel,
  }: {
    type: "FETCH_FEEDS" | "REFRESH_FEEDS" | "CHECK_UPDATES";
    urls: string[];
    fallbackLabel: string;
  }): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    const response = await this.sendWorkerMessage(
      "rss",
      {
        type,
        payload: {
          urls,
          apiBaseUrl: this.apiBaseUrl,
        },
      },
      "FEEDS_RESULT",
      async () => {
        Logger.debug(`[WorkerService] Using fallback fetcher for ${fallbackLabel}`);
        try {
          const result = await this.fallbackFetcher.fetchFeeds(urls);
          return { type: "FEEDS_RESULT" as const, success: true, ...result } as WorkerResponse;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            type: "FEEDS_RESULT" as const,
            success: false,
            feeds: [] as Feed[],
            items: [] as FeedItem[],
            message,
          } as WorkerResponse;
        }
      }
    );

    if (response.type !== "FEEDS_RESULT") {
      return {
        success: false,
        feeds: [],
        items: [],
        message: "Unexpected worker response type",
      };
    }

    return {
      success: response.success,
      feeds: response.feeds,
      items: response.items,
      message: response.message,
    };
  }

  async fetchFeeds(url: string | string[]): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    const urls = Array.isArray(url) ? url : [url];
    return this.sendFeedsRequest({
      type: "FETCH_FEEDS",
      urls,
      fallbackLabel: "fetch",
    });
  }

  async refreshFeeds(urls: string[]): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    return this.sendFeedsRequest({
      type: "REFRESH_FEEDS",
      urls,
      fallbackLabel: "refresh",
    });
  }

  async fetchReaderView(url: string): Promise<{
    success: boolean;
    data: ReaderViewResponse[];
    message?: string;
  }> {
    const response = await this.sendWorkerMessage(
      "rss",
      {
        type: "FETCH_READER_VIEW",
        payload: {
          urls: [url],
          apiBaseUrl: this.apiBaseUrl,
        },
      },
      "READER_VIEW_RESULT",
      async () => {
        Logger.debug("[WorkerService] Using fallback fetcher for reader view");
        try {
          const data = await this.fallbackFetcher.fetchReaderView([url]);
          return {
            type: "READER_VIEW_RESULT" as const,
            success: true,
            data,
          } as WorkerResponse;
        } catch (error: unknown) {
          return {
            type: "READER_VIEW_RESULT" as const,
            success: false,
            data: [] as ReaderViewResponse[],
            message: error instanceof Error ? error.message : "Failed to fetch reader view",
          } as WorkerResponse;
        }
      }
    );

    if (response.type !== "READER_VIEW_RESULT") {
      return {
        success: false,
        data: [],
        message: "Unexpected worker response type",
      };
    }

    return {
      success: response.success,
      data: response.data,
      message: response.message,
    };
  }

  async generateShadows(
    id: string,
    color: { r: number; g: number; b: number },
    isDarkMode: boolean
  ): Promise<{
    restShadow: string;
    hoverShadow: string;
    pressedShadow: string;
  }> {
    const cacheKey = `${id}-${isDarkMode}-${color.r}-${color.g}-${color.b}`;
    const cachedShadows = this.shadowCache.get(cacheKey);
    if (cachedShadows) {
      return cachedShadows;
    }

    const response = await this.sendWorkerMessage(
      "shadow",
      {
        type: "GENERATE_SHADOWS",
        payload: { id, color, isDarkMode },
      },
      "SHADOWS_RESULT",
      async () => {
        const { generateCardShadows } = await import("@/utils/shadow");
        const shadows = generateCardShadows(color, isDarkMode);
        return {
          type: "SHADOWS_RESULT" as const,
          payload: { id, shadows },
        } as WorkerResponse;
      },
      (workerResponse) =>
        workerResponse.type === "SHADOWS_RESULT" && workerResponse.payload.id === id
    );

    if (response.type !== "SHADOWS_RESULT") {
      throw new Error("Unexpected worker response type for shadows");
    }

    if (this.shadowCache.size >= 500) {
      const firstKey = this.shadowCache.keys().next().value;
      if (firstKey !== undefined) {
        this.shadowCache.delete(firstKey);
      }
    }
    this.shadowCache.set(cacheKey, response.payload.shadows);

    return response.payload.shadows;
  }

  async checkForUpdates(urls: string[]): Promise<{
    success: boolean;
    feeds: Feed[];
    items: FeedItem[];
    message?: string;
  }> {
    return this.sendFeedsRequest({
      type: "CHECK_UPDATES",
      urls,
      fallbackLabel: "updates",
    });
  }

  terminate(): void {
    this.detachWorkerHandlers();

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
    Logger.debug("WorkerService: Workers terminated");
  }
}

const workerServiceInstance = new WorkerService();

export { WorkerService };
export const workerService = workerServiceInstance;
