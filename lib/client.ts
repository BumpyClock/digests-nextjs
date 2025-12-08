import { Result } from "@/types";
import { getApiUrl } from "@/lib/config";

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class APIClient {
  private static instance: APIClient;
  private controller: AbortController;

  private constructor() {
    this.controller = new AbortController();
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<Result<T>> {
    try {
      const response = await fetch(getApiUrl(endpoint), {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new APIError(
          `HTTP error! status: ${response.status}`,
          response.status,
          await response.json().catch(() => null)
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error instanceof APIError) {
        return { success: false, error };
      }
      return {
        success: false,
        error: new APIError(error instanceof Error ? error.message : "Unknown error"),
      };
    }
  }

  abort(): void {
    this.controller.abort();
    this.controller = new AbortController();
  }
}

export const apiClient = APIClient.getInstance();
