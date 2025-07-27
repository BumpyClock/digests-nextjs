// ABOUTME: Comprehensive unit tests for useAuth hook and authentication functionality
// ABOUTME: Tests all auth mutations, state management, and React Query integration

import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth, authKeys } from '@/hooks/queries/use-auth'
import { getAuthPersister } from '@/lib/persistence/auth-persister'
import { authApiService } from '@/services/auth-api'
import type { AuthResponse, AuthTokens, User, AuthError, AuthErrorType } from '@/types/auth'

// Mock dependencies
jest.mock('@/lib/persistence/auth-persister')
jest.mock('@/services/auth-api')
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn(() => true)
}))
jest.mock('@/utils/logger', () => ({
  Logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

const mockGetAuthPersister = getAuthPersister as jest.MockedFunction<typeof getAuthPersister>
const mockAuthApi = authApiService as jest.Mocked<typeof authApiService>

describe('useAuth Hook', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  // Mock data
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    picture: 'https://example.com/avatar.jpg'
  }

  const mockTokens: AuthTokens = {
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
    expiresIn: 3600,
    tokenType: 'Bearer'
  }

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    tokens: mockTokens
  }

  const mockPersister = {
    storeTokens: jest.fn(),
    getTokens: jest.fn(),
    storeAuthState: jest.fn(),
    getAuthState: jest.fn(),
    shouldRefreshTokens: jest.fn(() => Promise.resolve(false)),
    clearTokens: jest.fn(),
    clearAuthState: jest.fn(),
    clearAll: jest.fn()
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    // Setup persister mock
    mockGetAuthPersister.mockResolvedValue(mockPersister as any)
    
    // Setup API mocks
    mockAuthApi.login.mockResolvedValue(mockAuthResponse)
    mockAuthApi.refreshTokens.mockResolvedValue({ tokens: mockTokens })
    mockAuthApi.logout.mockResolvedValue()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Initial State', () => {
    it('should return initial auth state when no stored data', async () => {
      mockPersister.getTokens.mockResolvedValue(null)
      mockPersister.getAuthState.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should restore auth state from storage', async () => {
      const storedState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }

      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue(storedState)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokens).toEqual(mockTokens)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Login Mutation', () => {
    it('should successfully log in user', async () => {
      mockPersister.getTokens.mockResolvedValue(null)
      mockPersister.getAuthState.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(mockPersister.storeTokens).toHaveBeenCalledWith(mockTokens)
      expect(mockPersister.storeAuthState).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          tokens: mockTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      )

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle login errors', async () => {
      const authError: AuthError = {
        type: 'INVALID_CREDENTIALS' as AuthErrorType,
        message: 'Invalid email or password',
        statusCode: 401
      }

      mockAuthApi.login.mockRejectedValue(authError)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        } catch (error) {
          expect(error).toEqual(authError)
        }
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toEqual(authError)
    })

    it('should show loading state during login', async () => {
      let resolveLogin: (value: AuthResponse) => void
      const loginPromise = new Promise<AuthResponse>((resolve) => {
        resolveLogin = resolve
      })
      
      mockAuthApi.login.mockReturnValue(loginPromise)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.login({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      expect(result.current.isLoggingIn).toBe(true)
      expect(result.current.isLoading).toBe(true)

      act(() => {
        resolveLogin!(mockAuthResponse)
      })

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false)
      })
    })
  })

  describe('Logout Mutation', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const authenticatedState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }

      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue(authenticatedState)
    })

    it('should successfully log out user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(mockAuthApi.logout).toHaveBeenCalledWith(mockTokens.refreshToken)
      expect(mockPersister.clearAll).toHaveBeenCalled()

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
    })

    it('should clear data even if API call fails', async () => {
      mockAuthApi.logout.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(mockPersister.clearAll).toHaveBeenCalled()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Token Refresh', () => {
    beforeEach(async () => {
      const authenticatedState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }

      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue(authenticatedState)
    })

    it('should refresh tokens successfully', async () => {
      const newTokens: AuthTokens = {
        ...mockTokens,
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token'
      }

      mockAuthApi.refreshTokens.mockResolvedValue({ tokens: newTokens })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.refreshTokens()
      })

      expect(mockAuthApi.refreshTokens).toHaveBeenCalledWith({
        refreshToken: mockTokens.refreshToken
      })

      expect(mockPersister.storeTokens).toHaveBeenCalledWith(newTokens)
      expect(result.current.tokens).toEqual(newTokens)
    })

    it('should logout user if refresh fails', async () => {
      const refreshError: AuthError = {
        type: 'INVALID_TOKEN' as AuthErrorType,
        message: 'Refresh token expired',
        statusCode: 401
      }

      mockAuthApi.refreshTokens.mockRejectedValue(refreshError)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        try {
          await result.current.refreshTokens()
        } catch (error) {
          // Expected to fail
        }
      })

      // Should trigger logout
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })
    })

    it('should auto-refresh tokens when needed', async () => {
      mockPersister.shouldRefreshTokens.mockResolvedValue(true)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Wait for auto-refresh to trigger
      await waitFor(() => {
        expect(mockAuthApi.refreshTokens).toHaveBeenCalled()
      }, { timeout: 5000 })
    })
  })

  describe('Registration', () => {
    it('should successfully register user', async () => {
      mockPersister.getTokens.mockResolvedValue(null)
      mockPersister.getAuthState.mockResolvedValue(null)
      mockAuthApi.register.mockResolvedValue(mockAuthResponse)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        })
      })

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle registration errors', async () => {
      const registrationError: AuthError = {
        type: 'USER_NOT_FOUND' as AuthErrorType, // Using for conflict
        message: 'User already exists',
        statusCode: 409
      }

      mockAuthApi.register.mockRejectedValue(registrationError)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            name: 'Existing User'
          })
        } catch (error) {
          expect(error).toEqual(registrationError)
        }
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toEqual(registrationError)
    })
  })

  describe('Feature Flag Handling', () => {
    it('should return initial state when feature flag is disabled', async () => {
      const { isFeatureEnabled } = require('@/lib/feature-flags')
      isFeatureEnabled.mockReturnValue(false)

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isReactQueryEnabled).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle persister initialization errors', async () => {
      mockGetAuthPersister.mockRejectedValue(new Error('Persister init failed'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.error?.type).toBe('UNKNOWN_ERROR')
    })

    it('should clear errors on successful operations', async () => {
      // First, cause an error
      mockAuthApi.login.mockRejectedValueOnce({
        type: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials'
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong'
          })
        } catch {}
      })

      expect(result.current.error).toBeTruthy()

      // Then succeed
      mockAuthApi.login.mockResolvedValue(mockAuthResponse)

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'correct'
        })
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup intervals on unmount', async () => {
      const { unmount } = renderHook(() => useAuth(), { wrapper })

      // Should not throw errors when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })
})