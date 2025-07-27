// ABOUTME: Authentication related types and interfaces
// ABOUTME: Defines user, auth state, and authentication response types

/**
 * User model representing authenticated user data
 */
export interface User {
  id: string
  email: string
  name?: string
  picture?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  preferences?: UserPreferences
}

/**
 * User preferences that persist across sessions
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  notifications?: NotificationPreferences
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email?: boolean
  push?: boolean
  feedUpdates?: boolean
  weeklyDigest?: boolean
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

/**
 * Authentication response from API
 */
export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  tokens: AuthTokens
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Authentication error
 */
export interface AuthError {
  type: AuthErrorType
  message: string
  statusCode?: number
}

/**
 * Auth state for React Query
 */
export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}