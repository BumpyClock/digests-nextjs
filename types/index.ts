/**
 * Barrel file for exporting all types
 */

export * from './feed'
export * from './api'
// Export everything except ApiError from api-client
export {
  type ApiClient,
  type RequestConfig,
  type RetryConfig,
  type CircuitBreakerConfig,
  CircuitState,
  type CircuitBreakerState,
  type RequestTracker,
  isApiError,
  isRetryableError,
  // Rename ApiError to avoid conflict
  type ApiError as ApiClientError
} from './api-client'
export * from './storage'
export * from './article'
export * from './common'

// Add any shared types here
export interface Timestamp {
  createdAt: number
  updatedAt: number
}

export interface Result<T, E = Error> {
  success: boolean
  data?: T
  error?: E
}