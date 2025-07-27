/**
 * Common type definitions used across the application
 */

/**
 * Generic API response wrapper
 * @template T The type of data returned in the response
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: ApiError
}

/**
 * Standard API error structure
 */
export interface ApiError {
  code: string
  message: string
  details?: unknown
  statusCode?: number
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

/**
 * Paginated response wrapper
 * @template T The type of items in the paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}