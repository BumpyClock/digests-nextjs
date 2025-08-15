/**
 * API Client types and interfaces for enhanced API functionality
 */

export interface ApiClient {
  request<T>(config: RequestConfig): Promise<T>;
  cancel(requestId: string): void;
  cancelAll(): void;
  updateApiConfig(config: Record<string, unknown>): void; // Required method, not optional
}

export interface RequestConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  retry?: RetryConfig;
  timeout?: number;
  signal?: AbortSignal;
  requestId?: string; // Optional ID for tracking/cancelling specific requests
}

export interface RetryConfig {
  attempts: number;
  backoff: "exponential" | "linear";
  maxDelay: number;
  initialDelay?: number;
  factor?: number; // For exponential backoff
  retryCondition?: (error: ApiError) => boolean;
}

export interface ApiError extends Error {
  code: string;
  status?: number;
  retry?: boolean;
  attempts?: number;
  originalError?: Error;
}

// Add alias for backward compatibility
export interface ApiClientError extends ApiError {
  // Inherits all properties from ApiError
  context?: string; // Add specific property to avoid empty interface
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms before attempting to close circuit
  halfOpenRequests: number; // Number of test requests in half-open state
}

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

export interface RequestTracker {
  promise: Promise<unknown>;
  controller: AbortController;
  timestamp: number;
  config: RequestConfig;
}

// Default configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  attempts: 3,
  backoff: "exponential",
  maxDelay: 30000, // 30 seconds
  initialDelay: 1000, // 1 second
  factor: 2,
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenRequests: 3,
};

// Helper type guards
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "code" in error;
}

export function isRetryableError(error: ApiError): boolean {
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
