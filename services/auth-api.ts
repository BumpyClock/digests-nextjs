// ABOUTME: Authentication API endpoints for login, registration, and token management
// ABOUTME: Extends the main API service with auth-specific functionality and error handling

import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse,
  AuthError,
  AuthErrorType,
  User
} from '@/types/auth'
import { apiService } from './api-service'
import { Logger } from '@/utils/logger'

/**
 * Authentication API service
 * Provides typed API calls for all auth operations
 */
export class AuthApiService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api/auth'
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      Logger.info('[AuthAPI] Attempting login for:', credentials.email)
      
      const response = await apiService.post<AuthResponse>(`${this.baseUrl}/login`, {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      })

      if (!this.isValidAuthResponse(response)) {
        throw this.createAuthError(
          'Invalid login response format',
          AuthErrorType.UNKNOWN_ERROR
        )
      }

      Logger.info('[AuthAPI] Login successful for:', credentials.email)
      return response
    } catch (error: any) {
      Logger.error('[AuthAPI] Login failed:', error)
      throw this.handleAuthError(error, 'Login failed')
    }
  }

  /**
   * Register new user account
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      Logger.info('[AuthAPI] Attempting registration for:', userData.email)
      
      const response = await apiService.post<AuthResponse>(`${this.baseUrl}/register`, {
        email: userData.email,
        password: userData.password,
        name: userData.name
      })

      if (!this.isValidAuthResponse(response)) {
        throw this.createAuthError(
          'Invalid registration response format',
          AuthErrorType.UNKNOWN_ERROR
        )
      }

      Logger.info('[AuthAPI] Registration successful for:', userData.email)
      return response
    } catch (error: any) {
      Logger.error('[AuthAPI] Registration failed:', error)
      throw this.handleAuthError(error, 'Registration failed')
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      Logger.debug('[AuthAPI] Refreshing tokens')
      
      const response = await apiService.post<RefreshTokenResponse>(`${this.baseUrl}/refresh`, {
        refreshToken: request.refreshToken
      })

      if (!this.isValidRefreshResponse(response)) {
        throw this.createAuthError(
          'Invalid refresh response format',
          AuthErrorType.INVALID_TOKEN
        )
      }

      Logger.debug('[AuthAPI] Token refresh successful')
      return response
    } catch (error: any) {
      Logger.error('[AuthAPI] Token refresh failed:', error)
      throw this.handleAuthError(error, 'Token refresh failed')
    }
  }

  /**
   * Logout and invalidate tokens
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Logging out user')
      
      await apiService.post(`${this.baseUrl}/logout`, {
        refreshToken
      })

      Logger.info('[AuthAPI] Logout successful')
    } catch (error: any) {
      Logger.warn('[AuthAPI] Logout API call failed (continuing):', error)
      // Don't throw - logout should succeed even if API fails
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      Logger.debug('[AuthAPI] Fetching current user')
      
      const response = await apiService.get<User>(`${this.baseUrl}/me`)

      if (!this.isValidUser(response)) {
        throw this.createAuthError(
          'Invalid user response format',
          AuthErrorType.UNKNOWN_ERROR
        )
      }

      return response
    } catch (error: any) {
      Logger.error('[AuthAPI] Failed to fetch current user:', error)
      throw this.handleAuthError(error, 'Failed to fetch user profile')
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      Logger.info('[AuthAPI] Updating user profile')
      
      const response = await apiService.patch<User>(`${this.baseUrl}/me`, updates)

      if (!this.isValidUser(response)) {
        throw this.createAuthError(
          'Invalid user update response',
          AuthErrorType.UNKNOWN_ERROR
        )
      }

      Logger.info('[AuthAPI] Profile updated successfully')
      return response
    } catch (error: any) {
      Logger.error('[AuthAPI] Profile update failed:', error)
      throw this.handleAuthError(error, 'Profile update failed')
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Changing user password')
      
      await apiService.post(`${this.baseUrl}/change-password`, {
        currentPassword,
        newPassword
      })

      Logger.info('[AuthAPI] Password changed successfully')
    } catch (error: any) {
      Logger.error('[AuthAPI] Password change failed:', error)
      throw this.handleAuthError(error, 'Password change failed')
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Requesting password reset for:', email)
      
      await apiService.post(`${this.baseUrl}/reset-password`, {
        email
      })

      Logger.info('[AuthAPI] Password reset requested')
    } catch (error: any) {
      Logger.error('[AuthAPI] Password reset request failed:', error)
      throw this.handleAuthError(error, 'Password reset request failed')
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Confirming password reset')
      
      await apiService.post(`${this.baseUrl}/reset-password/confirm`, {
        token,
        newPassword
      })

      Logger.info('[AuthAPI] Password reset confirmed')
    } catch (error: any) {
      Logger.error('[AuthAPI] Password reset confirmation failed:', error)
      throw this.handleAuthError(error, 'Password reset confirmation failed')
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Verifying email address')
      
      await apiService.post(`${this.baseUrl}/verify-email`, {
        token
      })

      Logger.info('[AuthAPI] Email verified successfully')
    } catch (error: any) {
      Logger.error('[AuthAPI] Email verification failed:', error)
      throw this.handleAuthError(error, 'Email verification failed')
    }
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<void> {
    try {
      Logger.info('[AuthAPI] Resending email verification for:', email)
      
      await apiService.post(`${this.baseUrl}/resend-verification`, {
        email
      })

      Logger.info('[AuthAPI] Verification email sent')
    } catch (error: any) {
      Logger.error('[AuthAPI] Failed to resend verification:', error)
      throw this.handleAuthError(error, 'Failed to resend verification email')
    }
  }

  /**
   * Validate response format for authentication
   */
  private isValidAuthResponse(response: any): response is AuthResponse {
    return (
      response &&
      typeof response === 'object' &&
      response.user &&
      response.tokens &&
      typeof response.user.id === 'string' &&
      typeof response.user.email === 'string' &&
      typeof response.tokens.accessToken === 'string' &&
      typeof response.tokens.refreshToken === 'string' &&
      typeof response.tokens.expiresIn === 'number'
    )
  }

  /**
   * Validate refresh token response format
   */
  private isValidRefreshResponse(response: any): response is RefreshTokenResponse {
    return (
      response &&
      typeof response === 'object' &&
      response.tokens &&
      typeof response.tokens.accessToken === 'string' &&
      typeof response.tokens.refreshToken === 'string' &&
      typeof response.tokens.expiresIn === 'number'
    )
  }

  /**
   * Validate user object format
   */
  private isValidUser(response: any): response is User {
    return (
      response &&
      typeof response === 'object' &&
      typeof response.id === 'string' &&
      typeof response.email === 'string' &&
      typeof response.createdAt === 'string' &&
      typeof response.updatedAt === 'string'
    )
  }

  /**
   * Create standardized auth error
   */
  private createAuthError(message: string, type: AuthErrorType, statusCode?: number): AuthError {
    return {
      type,
      message,
      statusCode
    }
  }

  /**
   * Handle and transform API errors to auth errors
   */
  private handleAuthError(error: any, fallbackMessage: string): AuthError {
    // If already an auth error, return as-is
    if (error.type && Object.values(AuthErrorType).includes(error.type)) {
      return error as AuthError
    }

    // Map common HTTP status codes
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode
      
      switch (status) {
        case 400:
          return this.createAuthError(
            error.message || 'Invalid request',
            AuthErrorType.INVALID_CREDENTIALS,
            status
          )
        case 401:
          return this.createAuthError(
            error.message || 'Authentication failed',
            AuthErrorType.INVALID_CREDENTIALS,
            status
          )
        case 403:
          return this.createAuthError(
            error.message || 'Access forbidden',
            AuthErrorType.ACCOUNT_LOCKED,
            status
          )
        case 404:
          return this.createAuthError(
            error.message || 'User not found',
            AuthErrorType.USER_NOT_FOUND,
            status
          )
        case 409:
          return this.createAuthError(
            error.message || 'User already exists',
            AuthErrorType.USER_NOT_FOUND, // Reusing for conflict
            status
          )
        case 422:
          return this.createAuthError(
            error.message || 'Email not verified',
            AuthErrorType.EMAIL_NOT_VERIFIED,
            status
          )
        case 429:
          return this.createAuthError(
            error.message || 'Too many requests',
            AuthErrorType.NETWORK_ERROR,
            status
          )
        case 500:
        case 502:
        case 503:
        case 504:
          return this.createAuthError(
            error.message || 'Server error',
            AuthErrorType.NETWORK_ERROR,
            status
          )
        default:
          return this.createAuthError(
            error.message || fallbackMessage,
            AuthErrorType.UNKNOWN_ERROR,
            status
          )
      }
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
      return this.createAuthError(
        'Network error - please check your connection',
        AuthErrorType.NETWORK_ERROR
      )
    }

    // Handle timeout errors
    if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
      return this.createAuthError(
        'Request timed out - please try again',
        AuthErrorType.NETWORK_ERROR
      )
    }

    // Generic fallback
    return this.createAuthError(
      error.message || fallbackMessage,
      AuthErrorType.UNKNOWN_ERROR
    )
  }
}

/**
 * Global auth API service instance
 */
export const authApiService = new AuthApiService()

/**
 * Export convenience functions
 */
export const authApi = {
  login: (credentials: LoginRequest) => authApiService.login(credentials),
  register: (userData: RegisterRequest) => authApiService.register(userData),
  refreshTokens: (request: RefreshTokenRequest) => authApiService.refreshTokens(request),
  logout: (refreshToken?: string) => authApiService.logout(refreshToken),
  getCurrentUser: () => authApiService.getCurrentUser(),
  updateProfile: (updates: Partial<User>) => authApiService.updateProfile(updates),
  changePassword: (current: string, newPassword: string) => authApiService.changePassword(current, newPassword),
  requestPasswordReset: (email: string) => authApiService.requestPasswordReset(email),
  confirmPasswordReset: (token: string, newPassword: string) => authApiService.confirmPasswordReset(token, newPassword),
  verifyEmail: (token: string) => authApiService.verifyEmail(token),
  resendVerification: (email: string) => authApiService.resendVerification(email)
}