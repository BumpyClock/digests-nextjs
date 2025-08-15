/**
 * Standardized error handling utilities for consistent error management
 */

import { Logger } from "@/utils/logger";
import * as Sentry from "@sentry/nextjs";

export enum ErrorType {
  NETWORK = "NETWORK_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTH_ERROR",
  AUTHORIZATION = "AUTHZ_ERROR",
  NOT_FOUND = "NOT_FOUND_ERROR",
  TIMEOUT = "TIMEOUT_ERROR",
  SERVER = "SERVER_ERROR",
  CLIENT = "CLIENT_ERROR",
  CIRCUIT_BREAKER = "CIRCUIT_BREAKER_OPEN",
  UNKNOWN = "UNKNOWN_ERROR",
}

export interface StandardError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
  context?: Record<string, unknown>;
  originalError?: Error;
}

export class AppError extends Error implements StandardError {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options: {
      code?: string;
      statusCode?: number;
      retryable?: boolean;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.context = options.context;
    this.originalError = options.originalError;
  }
}

/**
 * Creates a standardized error from various input types
 */
export function createStandardError(
  error: unknown,
  fallbackType: ErrorType = ErrorType.UNKNOWN,
  context?: Record<string, unknown>
): StandardError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Try to determine error type from the error
    let type = fallbackType;
    let statusCode: number | undefined;
    let retryable = false;

    if (error.message.includes("fetch")) {
      type = ErrorType.NETWORK;
      retryable = true;
    } else if (error.message.includes("timeout")) {
      type = ErrorType.TIMEOUT;
      retryable = true;
    } else if (error.message.includes("401")) {
      type = ErrorType.AUTHENTICATION;
      statusCode = 401;
    } else if (error.message.includes("403")) {
      type = ErrorType.AUTHORIZATION;
      statusCode = 403;
    } else if (error.message.includes("404")) {
      type = ErrorType.NOT_FOUND;
      statusCode = 404;
    } else if (error.message.includes("5")) {
      type = ErrorType.SERVER;
      statusCode = 500;
      retryable = true;
    }

    return new AppError(error.message, type, {
      statusCode,
      retryable,
      context,
      originalError: error,
    });
  }

  // Handle unknown error types
  return new AppError(
    typeof error === "string" ? error : "An unknown error occurred",
    fallbackType,
    {
      context: { ...context, originalError: error },
    }
  );
}

/**
 * Handles errors consistently across the application
 */
export function handleError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): StandardError {
  const standardError = createStandardError(error, ErrorType.UNKNOWN, context);

  // Log the error
  Logger.error(`Error in ${operation}`, {
    error: standardError.message,
    type: standardError.type,
    code: standardError.code,
    statusCode: standardError.statusCode,
    context: standardError.context,
  });

  // Report to Sentry for non-client errors
  if (
    standardError.type !== ErrorType.VALIDATION &&
    standardError.type !== ErrorType.CLIENT
  ) {
    Sentry.withScope((scope) => {
      scope.setTag("operation", operation);
      scope.setContext("error", {
        type: standardError.type,
        code: standardError.code,
        statusCode: standardError.statusCode,
        retryable: standardError.retryable,
      });
      if (context) {
        scope.setContext("operationContext", context);
      }
      Sentry.captureException(standardError.originalError || standardError);
    });
  }

  return standardError;
}

/**
 * Wraps async operations with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleError(error, operationName, context);
  }
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  
  // Default retry logic for common error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("connection")
    );
  }

  return false;
}

/**
 * Gets a user-friendly error message
 */
export function getUserFriendlyMessage(error: StandardError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return "Network connection error. Please check your internet connection and try again.";
    case ErrorType.TIMEOUT:
      return "The request timed out. Please try again.";
    case ErrorType.AUTHENTICATION:
      return "Authentication failed. Please log in again.";
    case ErrorType.AUTHORIZATION:
      return "You don't have permission to perform this action.";
    case ErrorType.NOT_FOUND:
      return "The requested resource could not be found.";
    case ErrorType.SERVER:
      return "A server error occurred. Please try again later.";
    case ErrorType.VALIDATION:
      return error.message; // Validation messages are usually user-friendly
    case ErrorType.CIRCUIT_BREAKER:
      return "Service is temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}