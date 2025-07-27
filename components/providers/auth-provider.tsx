// ABOUTME: Authentication provider component with React Query integration
// ABOUTME: Manages auth state, token refresh, and provides auth context to the entire app

'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuth, useAuthState } from '@/hooks/queries/use-auth'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Logger } from '@/utils/logger'
import type { User, AuthError } from '@/types/auth'

/**
 * Auth context interface
 */
interface AuthContextType {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  refetchAuth: () => void
  
  // Status flags
  isLoggingIn: boolean
  isLoggingOut: boolean
  isRegistering: boolean
  isRefreshing: boolean
  
  // Feature flag status
  isReactQueryEnabled: boolean
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode
  /** Override feature flag for testing */
  forceEnabled?: boolean
  /** Custom error handler */
  onError?: (error: AuthError) => void
  /** Custom auth success handler */
  onAuthSuccess?: (user: User) => void
  /** Custom logout handler */
  onLogout?: () => void
}

/**
 * Authentication provider component
 */
export function AuthProvider({ 
  children, 
  forceEnabled = false,
  onError,
  onAuthSuccess,
  onLogout
}: AuthProviderProps) {
  const isEnabled = forceEnabled || isFeatureEnabled('USE_REACT_QUERY_AUTH')
  
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: authLogin,
    register: authRegister,
    logout: authLogout,
    refreshTokens: authRefresh,
    refetchAuth,
    isLoggingIn,
    isLoggingOut,
    isRegistering,
    isRefreshing,
    isReactQueryEnabled
  } = useAuth()

  /**
   * Handle authentication errors
   */
  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  /**
   * Handle successful authentication
   */
  useEffect(() => {
    if (isAuthenticated && user && onAuthSuccess) {
      onAuthSuccess(user)
    }
  }, [isAuthenticated, user, onAuthSuccess])

  /**
   * Wrapped login function
   */
  const login = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      Logger.info('[AuthProvider] Login initiated for:', email)
      await authLogin({ email, password, rememberMe })
      Logger.info('[AuthProvider] Login completed successfully')
    } catch (error) {
      Logger.error('[AuthProvider] Login failed:', error)
      throw error
    }
  }

  /**
   * Wrapped register function
   */
  const register = async (email: string, password: string, name?: string) => {
    try {
      Logger.info('[AuthProvider] Registration initiated for:', email)
      await authRegister({ email, password, name })
      Logger.info('[AuthProvider] Registration completed successfully')
    } catch (error) {
      Logger.error('[AuthProvider] Registration failed:', error)
      throw error
    }
  }

  /**
   * Wrapped logout function
   */
  const logout = async () => {
    try {
      Logger.info('[AuthProvider] Logout initiated')
      await authLogout()
      
      if (onLogout) {
        onLogout()
      }
      
      Logger.info('[AuthProvider] Logout completed successfully')
    } catch (error) {
      Logger.error('[AuthProvider] Logout failed:', error)
      throw error
    }
  }

  /**
   * Wrapped refresh function
   */
  const refreshTokens = async () => {
    try {
      Logger.debug('[AuthProvider] Token refresh initiated')
      await authRefresh()
      Logger.debug('[AuthProvider] Token refresh completed')
    } catch (error) {
      Logger.error('[AuthProvider] Token refresh failed:', error)
      throw error
    }
  }

  /**
   * Context value
   */
  const contextValue: AuthContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    refreshTokens,
    refetchAuth,
    
    // Status flags
    isLoggingIn,
    isLoggingOut,
    isRegistering,
    isRefreshing,
    
    // Feature flag status
    isReactQueryEnabled: isEnabled && isReactQueryEnabled
  }

  // If React Query auth is disabled, provide minimal context
  if (!isEnabled) {
    const fallbackValue: AuthContextType = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async () => { throw new Error('React Query auth is disabled') },
      register: async () => { throw new Error('React Query auth is disabled') },
      logout: async () => { throw new Error('React Query auth is disabled') },
      refreshTokens: async () => { throw new Error('React Query auth is disabled') },
      refetchAuth: () => {},
      isLoggingIn: false,
      isLoggingOut: false,
      isRegistering: false,
      isRefreshing: false,
      isReactQueryEnabled: false
    }

    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use auth context
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  
  return context
}

/**
 * Hook for checking if user is authenticated (lightweight)
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated
}

/**
 * Hook for getting current user (lightweight)
 */
export function useCurrentUser(): User | null {
  const { user } = useAuthContext()
  return user
}

/**
 * Hook for auth actions only
 */
export function useAuthActions() {
  const { login, register, logout, refreshTokens, refetchAuth } = useAuthContext()
  
  return {
    login,
    register,
    logout,
    refreshTokens,
    refetchAuth
  }
}

/**
 * Hook for auth loading states
 */
export function useAuthLoading() {
  const { 
    isLoading, 
    isLoggingIn, 
    isLoggingOut, 
    isRegistering, 
    isRefreshing 
  } = useAuthContext()
  
  return {
    isLoading,
    isLoggingIn,
    isLoggingOut,
    isRegistering,
    isRefreshing,
    isAnyLoading: isLoading || isLoggingIn || isLoggingOut || isRegistering || isRefreshing
  }
}

/**
 * HOC to require authentication
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthContext()
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }
    
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to access this page.</p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

/**
 * Component to conditionally render based on auth status
 */
interface AuthGateProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
  requireGuest?: boolean
}

export function AuthGate({ 
  children, 
  fallback = null, 
  requireAuth = false, 
  requireGuest = false 
}: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuthContext()
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    )
  }
  
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }
  
  if (requireGuest && isAuthenticated) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Debug component for development
 */
export function AuthDebugInfo() {
  const authState = useAuthContext()
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>Authenticated: {authState.isAuthenticated ? '✅' : '❌'}</div>
        <div>Loading: {authState.isLoading ? '⏳' : '✅'}</div>
        <div>User: {authState.user?.email || 'None'}</div>
        <div>RQ Enabled: {authState.isReactQueryEnabled ? '✅' : '❌'}</div>
        {authState.error && (
          <div className="text-destructive">
            Error: {authState.error.message}
          </div>
        )}
      </div>
    </div>
  )
}