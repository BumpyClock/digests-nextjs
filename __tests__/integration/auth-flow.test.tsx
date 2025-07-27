// ABOUTME: Integration tests for complete authentication flow including login, logout, and session restoration
// ABOUTME: Tests end-to-end auth scenarios with React Query and persistence layer

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/components/providers/auth-provider'
import { LoginForm } from '@/components/auth/LoginForm'
import { UserMenu } from '@/components/auth/UserMenu'
import { AuthButton } from '@/components/auth/AuthButton'
import { getAuthPersister } from '@/lib/persistence/auth-persister'
import { authApiService } from '@/services/auth-api'
import type { User, AuthTokens, AuthResponse } from '@/types/auth'

// Mock external dependencies
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

describe('Authentication Flow Integration', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

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
    jest.clearAllMocks()
    user = userEvent.setup()
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Setup persister mock
    mockGetAuthPersister.mockResolvedValue(mockPersister as any)
    
    // Setup API mocks
    mockAuthApi.login.mockResolvedValue(mockAuthResponse)
    mockAuthApi.logout.mockResolvedValue()
    mockAuthApi.refreshTokens.mockResolvedValue({ tokens: mockTokens })
    
    // Default persister responses
    mockPersister.getTokens.mockResolvedValue(null)
    mockPersister.getAuthState.mockResolvedValue(null)
  })

  const renderWithAuth = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  describe('Complete Login Flow', () => {
    it('should complete full login flow from form to authenticated state', async () => {
      const TestApp = () => (
        <div>
          <AuthButton variant="modal" />
          <div data-testid="auth-status">
            <UserMenu />
          </div>
        </div>
      )

      renderWithAuth(<TestApp />)

      // Initially should show login button
      expect(screen.getByText('Sign in')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /test user/i })).not.toBeInTheDocument()

      // Click sign in button to open modal
      await user.click(screen.getByText('Sign in'))

      // Wait for login form to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })

      // Fill out login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      // Verify persistence calls
      expect(mockPersister.storeTokens).toHaveBeenCalledWith(mockTokens)
      expect(mockPersister.storeAuthState).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          isAuthenticated: true
        })
      )

      // Should now show user menu instead of login button
      await waitFor(() => {
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
      })
    })

    it('should handle login errors gracefully', async () => {
      mockAuthApi.login.mockRejectedValue({
        type: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      })

      renderWithAuth(<LoginForm />)

      // Fill out form with invalid credentials
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })

      // Should not store any data
      expect(mockPersister.storeTokens).not.toHaveBeenCalled()
      expect(mockPersister.storeAuthState).not.toHaveBeenCalled()
    })

    it('should validate form inputs before submission', async () => {
      renderWithAuth(<LoginForm />)

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })

      // Should not call API
      expect(mockAuthApi.login).not.toHaveBeenCalled()

      // Try with invalid email
      await user.type(screen.getByLabelText(/email/i), 'invalid-email')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })

      expect(mockAuthApi.login).not.toHaveBeenCalled()
    })
  })

  describe('Session Restoration', () => {
    it('should restore user session from storage on app load', async () => {
      // Mock stored auth data
      const storedState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }

      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue(storedState)

      const TestApp = () => (
        <div>
          <AuthButton />
          <UserMenu />
        </div>
      )

      renderWithAuth(<TestApp />)

      // Should restore authenticated state
      await waitFor(() => {
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
      })

      // Verify persister was called
      expect(mockPersister.getTokens).toHaveBeenCalled()
      expect(mockPersister.getAuthState).toHaveBeenCalled()
    })

    it('should handle corrupted storage data gracefully', async () => {
      // Mock corrupted data
      mockPersister.getTokens.mockRejectedValue(new Error('Storage corrupted'))
      mockPersister.getAuthState.mockRejectedValue(new Error('Storage corrupted'))

      const TestApp = () => (
        <div>
          <AuthButton />
        </div>
      )

      renderWithAuth(<TestApp />)

      // Should fall back to unauthenticated state
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument()
      })
    })

    it('should handle expired tokens during restoration', async () => {
      // Mock expired tokens
      const expiredTokens = {
        ...mockTokens,
        expiresIn: -3600 // Expired
      }

      mockPersister.getTokens.mockResolvedValue(expiredTokens)
      mockPersister.getAuthState.mockResolvedValue({
        user: mockUser,
        tokens: expiredTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      const TestApp = () => <AuthButton />

      renderWithAuth(<TestApp />)

      // Should clear expired data and show login
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument()
      })
    })
  })

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Setup authenticated state
      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    })

    it('should complete full logout flow', async () => {
      const TestApp = () => (
        <div>
          <UserMenu />
          <AuthButton />
        </div>
      )

      renderWithAuth(<TestApp />)

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
      })

      // Find and click user menu trigger
      const userMenuTrigger = screen.getByRole('button')
      await user.click(userMenuTrigger)

      // Find logout option
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument()
      })

      // Click logout
      await user.click(screen.getByText(/sign out/i))

      // Wait for logout to complete
      await waitFor(() => {
        expect(mockAuthApi.logout).toHaveBeenCalledWith(mockTokens.refreshToken)
      })

      // Verify cleanup
      expect(mockPersister.clearAll).toHaveBeenCalled()

      // Should show login button again
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument()
      })
    })

    it('should logout even if API call fails', async () => {
      mockAuthApi.logout.mockRejectedValue(new Error('Network error'))

      const TestApp = () => <UserMenu />

      renderWithAuth(<TestApp />)

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      // Open menu and logout
      await user.click(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument()
      })

      await user.click(screen.getByText(/sign out/i))

      // Should still clear local data
      await waitFor(() => {
        expect(mockPersister.clearAll).toHaveBeenCalled()
      })
    })
  })

  describe('Token Refresh Flow', () => {
    beforeEach(() => {
      // Setup authenticated state
      mockPersister.getTokens.mockResolvedValue(mockTokens)
      mockPersister.getAuthState.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    })

    it('should automatically refresh tokens when needed', async () => {
      // Mock token refresh needed
      mockPersister.shouldRefreshTokens.mockResolvedValue(true)

      const newTokens = {
        ...mockTokens,
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token'
      }

      mockAuthApi.refreshTokens.mockResolvedValue({ tokens: newTokens })

      const TestApp = () => <UserMenu />

      renderWithAuth(<TestApp />)

      // Wait for auto-refresh to trigger
      await waitFor(() => {
        expect(mockAuthApi.refreshTokens).toHaveBeenCalledWith({
          refreshToken: mockTokens.refreshToken
        })
      }, { timeout: 5000 })

      // Should store new tokens
      expect(mockPersister.storeTokens).toHaveBeenCalledWith(newTokens)
    })

    it('should logout user if token refresh fails', async () => {
      mockPersister.shouldRefreshTokens.mockResolvedValue(true)
      mockAuthApi.refreshTokens.mockRejectedValue({
        type: 'INVALID_TOKEN',
        message: 'Refresh token expired'
      })

      const TestApp = () => (
        <div>
          <UserMenu />
          <AuthButton />
        </div>
      )

      renderWithAuth(<TestApp />)

      // Wait for refresh failure and logout
      await waitFor(() => {
        expect(mockPersister.clearAll).toHaveBeenCalled()
      }, { timeout: 5000 })

      // Should show login button
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('should toggle password visibility', async () => {
      renderWithAuth(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByRole('button', { name: /show password/i })

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click to hide password again
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should handle remember me checkbox', async () => {
      renderWithAuth(<LoginForm />)

      const rememberMeCheckbox = screen.getByLabelText(/remember me/i)

      // Initially unchecked
      expect(rememberMeCheckbox).not.toBeChecked()

      // Check the box
      await user.click(rememberMeCheckbox)
      expect(rememberMeCheckbox).toBeChecked()

      // Fill form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should pass rememberMe flag to API
      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true
        })
      })
    })

    it('should clear validation errors when user types', async () => {
      renderWithAuth(<LoginForm />)

      // Submit empty form to trigger validation
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })

      // Start typing in email field
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      // Mock slow login
      let resolveLogin: (value: AuthResponse) => void
      const loginPromise = new Promise<AuthResponse>((resolve) => {
        resolveLogin = resolve
      })
      mockAuthApi.login.mockReturnValue(loginPromise)

      renderWithAuth(<LoginForm />)

      // Fill form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })

      // Resolve login
      act(() => {
        resolveLogin!(mockAuthResponse)
      })

      // Loading should disappear
      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
      })
    })
  })
})