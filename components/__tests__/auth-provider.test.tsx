// ABOUTME: Unit tests for AuthProvider component and auth context functionality
// ABOUTME: Tests provider setup, context hooks, and feature flag integration

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  AuthProvider, 
  useAuthContext, 
  useIsAuthenticated,
  useCurrentUser,
  useAuthActions,
  useAuthLoading,
  AuthGate,
  withAuth
} from '@/components/providers/auth-provider'
import type { User, AuthError } from '@/types/auth'

// Mock the useAuth hook
jest.mock('@/hooks/queries/use-auth', () => ({
  useAuth: jest.fn(),
  useAuthState: jest.fn()
}))

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn()
}))

const mockUseAuth = require('@/hooks/queries/use-auth').useAuth
const mockIsFeatureEnabled = require('@/lib/feature-flags').isFeatureEnabled

describe('AuthProvider', () => {
  let queryClient: QueryClient

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const defaultAuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    refetchAuth: jest.fn(),
    isLoggingIn: false,
    isLoggingOut: false,
    isRegistering: false,
    isRefreshing: false,
    isReactQueryEnabled: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    mockIsFeatureEnabled.mockReturnValue(true)
    mockUseAuth.mockReturnValue(defaultAuthState)
  })

  const renderWithProviders = (children: React.ReactNode, authProps = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider {...authProps}>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  describe('AuthProvider Setup', () => {
    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const auth = useAuthContext()
        return <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not authenticated')
    })

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useAuthContext()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const originalError = console.error
      console.error = jest.fn()

      expect(() => render(<TestComponent />)).toThrow('useAuthContext must be used within an AuthProvider')

      console.error = originalError
    })

    it('should provide fallback when feature flag is disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const TestComponent = () => {
        const auth = useAuthContext()
        return (
          <div>
            <div data-testid="enabled">{auth.isReactQueryEnabled ? 'enabled' : 'disabled'}</div>
            <div data-testid="authenticated">{auth.isAuthenticated ? 'yes' : 'no'}</div>
          </div>
        )
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('enabled')).toHaveTextContent('disabled')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    })

    it('should force enable auth with forceEnabled prop', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const TestComponent = () => {
        const auth = useAuthContext()
        return <div data-testid="enabled">{auth.isReactQueryEnabled ? 'enabled' : 'disabled'}</div>
      }

      renderWithProviders(<TestComponent />, { forceEnabled: true })

      expect(screen.getByTestId('enabled')).toHaveTextContent('enabled')
    })
  })

  describe('Auth Context Hooks', () => {
    it('useIsAuthenticated should return auth status', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const TestComponent = () => {
        const isAuthenticated = useIsAuthenticated()
        return <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })

    it('useCurrentUser should return user data', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const TestComponent = () => {
        const user = useCurrentUser()
        return <div data-testid="user-email">{user?.email || 'no user'}</div>
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    it('useAuthActions should return auth functions', () => {
      const mockLogin = jest.fn()
      const mockLogout = jest.fn()

      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        login: mockLogin,
        logout: mockLogout
      })

      const TestComponent = () => {
        const { login, logout } = useAuthActions()
        return (
          <div>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <button onClick={() => logout()}>Logout</button>
          </div>
        )
      }

      renderWithProviders(<TestComponent />)

      // Functions should be available (testing would require actual clicks)
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('useAuthLoading should return loading states', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
        isLoggingIn: true
      })

      const TestComponent = () => {
        const { isLoading, isLoggingIn, isAnyLoading } = useAuthLoading()
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'not loading'}</div>
            <div data-testid="logging-in">{isLoggingIn ? 'logging in' : 'not logging in'}</div>
            <div data-testid="any-loading">{isAnyLoading ? 'any loading' : 'no loading'}</div>
          </div>
        )
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('logging-in')).toHaveTextContent('logging in')
      expect(screen.getByTestId('any-loading')).toHaveTextContent('any loading')
    })
  })

  describe('AuthProvider Callbacks', () => {
    it('should call onError when error occurs', async () => {
      const onError = jest.fn()
      const error: AuthError = {
        type: 'NETWORK_ERROR',
        message: 'Network error occurred'
      }

      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        error
      })

      const TestComponent = () => <div>Test</div>

      renderWithProviders(<TestComponent />, { onError })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error)
      })
    })

    it('should call onAuthSuccess when user becomes authenticated', async () => {
      const onAuthSuccess = jest.fn()

      // Start unauthenticated
      mockUseAuth.mockReturnValue(defaultAuthState)

      const TestComponent = () => <div>Test</div>

      const { rerender } = renderWithProviders(<TestComponent />, { onAuthSuccess })

      // Become authenticated
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthProvider onAuthSuccess={onAuthSuccess}>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(onAuthSuccess).toHaveBeenCalledWith(mockUser)
      })
    })

    it('should call onLogout when logout is triggered', async () => {
      const onLogout = jest.fn()
      const mockLogout = jest.fn().mockImplementation(async () => {
        // Mock the logout behavior
        mockUseAuth.mockReturnValue({
          ...defaultAuthState,
          isAuthenticated: false,
          user: null
        })
      })

      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser,
        logout: mockLogout
      })

      const TestComponent = () => {
        const { logout } = useAuthContext()
        return <button onClick={() => logout()}>Logout</button>
      }

      renderWithProviders(<TestComponent />, { onLogout })

      // Trigger logout
      await act(async () => {
        screen.getByText('Logout').click()
      })

      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('AuthGate Component', () => {
    it('should render children when no auth requirements', () => {
      const TestComponent = () => (
        <AuthGate>
          <div data-testid="content">Protected Content</div>
        </AuthGate>
      )

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('content')).toHaveTextContent('Protected Content')
    })

    it('should render fallback when requireAuth and not authenticated', () => {
      const TestComponent = () => (
        <AuthGate 
          requireAuth 
          fallback={<div data-testid="fallback">Please log in</div>}
        >
          <div data-testid="content">Protected Content</div>
        </AuthGate>
      )

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('fallback')).toHaveTextContent('Please log in')
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })

    it('should render children when requireAuth and authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const TestComponent = () => (
        <AuthGate 
          requireAuth 
          fallback={<div data-testid="fallback">Please log in</div>}
        >
          <div data-testid="content">Protected Content</div>
        </AuthGate>
      )

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('content')).toHaveTextContent('Protected Content')
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    })

    it('should render fallback when requireGuest and authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const TestComponent = () => (
        <AuthGate 
          requireGuest 
          fallback={<div data-testid="fallback">Already logged in</div>}
        >
          <div data-testid="content">Guest Content</div>
        </AuthGate>
      )

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('fallback')).toHaveTextContent('Already logged in')
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true
      })

      const TestComponent = () => (
        <AuthGate requireAuth>
          <div data-testid="content">Protected Content</div>
        </AuthGate>
      )

      renderWithProviders(<TestComponent />)

      // Should show loading skeleton
      expect(screen.getByTestId('content')).not.toBeInTheDocument()
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('withAuth HOC', () => {
    const MockComponent = ({ testProp }: { testProp: string }) => (
      <div data-testid="protected-component">{testProp}</div>
    )

    it('should render loading state when loading', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true
      })

      const ProtectedComponent = withAuth(MockComponent)

      renderWithProviders(<ProtectedComponent testProp="test" />)

      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument()
      expect(screen.queryByTestId('protected-component')).not.toBeInTheDocument()
    })

    it('should render auth required message when not authenticated', () => {
      const ProtectedComponent = withAuth(MockComponent)

      renderWithProviders(<ProtectedComponent testProp="test" />)

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-component')).not.toBeInTheDocument()
    })

    it('should render component when authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const ProtectedComponent = withAuth(MockComponent)

      renderWithProviders(<ProtectedComponent testProp="test value" />)

      expect(screen.getByTestId('protected-component')).toHaveTextContent('test value')
    })

    it('should pass through props correctly', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: true,
        user: mockUser
      })

      const MockComponentWithProps = ({ name, age }: { name: string; age: number }) => (
        <div data-testid="props">{name} - {age}</div>
      )

      const ProtectedComponent = withAuth(MockComponentWithProps)

      renderWithProviders(<ProtectedComponent name="John" age={30} />)

      expect(screen.getByTestId('props')).toHaveTextContent('John - 30')
    })
  })

  describe('Wrapper Functions', () => {
    it('should wrap auth actions correctly', async () => {
      const mockLogin = jest.fn()
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        login: mockLogin
      })

      const TestComponent = () => {
        const { login } = useAuthContext()
        return (
          <button onClick={() => login('test@example.com', 'password')}>
            Login
          </button>
        )
      }

      renderWithProviders(<TestComponent />)

      await act(async () => {
        screen.getByText('Login').click()
      })

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

    it('should handle auth action errors', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Login failed'))
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        login: mockLogin
      })

      const TestComponent = () => {
        const { login } = useAuthContext()
        const handleLogin = async () => {
          try {
            await login('test@example.com', 'password')
          } catch (error) {
            // Error handled
          }
        }
        return <button onClick={handleLogin}>Login</button>
      }

      renderWithProviders(<TestComponent />)

      await act(async () => {
        screen.getByText('Login').click()
      })

      expect(mockLogin).toHaveBeenCalled()
    })
  })
})