/**
 * Error hierarchy for the application
 */

/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * API-related errors
 */
export class APIError extends AppError {
  /**
   * @param message - Error message
   * @param statusCode - HTTP status code if available
   * @param body - Response body if available
   */
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends APIError {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends APIError {
  constructor(message: string = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Storage-related errors
 */
export class StorageError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}
