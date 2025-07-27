// ABOUTME: React Query authentication hook with offline support and token management
// ABOUTME: Provides authentication state, mutations, and secure persistence for the entire app

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import type { 
  User, 
  AuthTokens, 
  AuthState, 
  LoginRequest, 
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthError,
  AuthErrorType
} from '@/types/auth'
import { getAuthPersister } from '@/lib/persistence/auth-persister'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Logger } from '@/utils/logger'
import { apiService } from '@/services/api-service'

/**
 * Auth query keys for React Query
 */
export const authKeys = {
  all: ['auth'] as const,
  state: () => [...authKeys.all, 'state'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  tokens: () => [...authKeys.all, 'tokens'] as const,
  status: () => [...authKeys.all, 'status'] as const,
} as const

/**
 * Initial auth state
 */
const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

/**
 * Main authentication hook with React Query
 */
export function useAuth() {
  const queryClient = useQueryClient()
  const isReactQueryAuthEnabled = isFeatureEnabled('USE_REACT_QUERY_AUTH')

  // Get auth persister
  const getAuthPersisterAsync = useCallback(async () => {
    return await getAuthPersister()
  }, [])

  /**
   * Auth state query - retrieves and maintains authentication state
   */
  const {
    data: authState = INITIAL_AUTH_STATE,
    isLoading: isStateLoading,
    error: stateError,
    refetch: refetchAuth
  } = useQuery({
    queryKey: authKeys.state(),
    queryFn: async (): Promise<AuthState> => {
      if (!isReactQueryAuthEnabled) {
        return INITIAL_AUTH_STATE
      }

      try {
        const persister = await getAuthPersisterAsync()
        
        // Try to restore from storage
        const [storedTokens, storedState] = await Promise.all([
          persister.getTokens(),
          persister.getAuthState()
        ])

        // If we have stored state, use it
        if (storedState && storedTokens) {
          Logger.debug('[useAuth] Restored auth state from storage')
          return {
            ...storedState,
            tokens: storedTokens,
            isLoading: false
          }
        }

        // No stored auth data
        return INITIAL_AUTH_STATE
      } catch (error) {
        Logger.error('[useAuth] Failed to load auth state:', error)
        return {
          ...INITIAL_AUTH_STATE,
          error: {
            type: AuthErrorType.UNKNOWN_ERROR,
            message: 'Failed to load authentication state'
          }
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: isReactQueryAuthEnabled,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      return failureCount < 2
    }
  })

  /**
   * Login mutation
   */
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<AuthResponse> => {
      Logger.info('[useAuth] Attempting login for:', credentials.email)
      
      try {
        // Call API service for login
        const response = await apiService.post<AuthResponse>('/auth/login', credentials)
        
        if (!response || !response.user || !response.tokens) {
          throw new Error('Invalid login response')
        }

        return response
      } catch (error: any) {
        Logger.error('[useAuth] Login failed:', error)
        
        // Map API errors to auth errors
        const authError: AuthError = {
          type: error.statusCode === 401 
            ? AuthErrorType.INVALID_CREDENTIALS 
            : AuthErrorType.NETWORK_ERROR,
          message: error.message || 'Login failed',
          statusCode: error.statusCode
        }
        
        throw authError
      }
    },
    onMutate: async () => {
      // Optimistic update - set loading state
      const previousState = authState
      
      queryClient.setQueryData(authKeys.state(), (old: AuthState = INITIAL_AUTH_STATE) => ({
        ...old,
        isLoading: true,
        error: null
      }))

      return { previousState }
    },
    onSuccess: async (authResponse: AuthResponse) => {
      try {
        const persister = await getAuthPersisterAsync()
        
        // Create new auth state
        const newAuthState: AuthState = {
          user: authResponse.user,
          tokens: authResponse.tokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }

        // Persist tokens and state
        await Promise.all([
          persister.storeTokens(authResponse.tokens),
          persister.storeAuthState(newAuthState)
        ])

        // Update React Query cache
        queryClient.setQueryData(authKeys.state(), newAuthState)
        queryClient.setQueryData(authKeys.user(), authResponse.user)
        queryClient.setQueryData(authKeys.tokens(), authResponse.tokens)

        Logger.info('[useAuth] Login successful for user:', authResponse.user.email)
      } catch (error) {
        Logger.error('[useAuth] Failed to persist login data:', error)
        throw error
      }
    },
    onError: (error: AuthError, variables, context) => {
      Logger.error('[useAuth] Login mutation failed:', error)
      
      // Revert optimistic update
      if (context?.previousState) {
        queryClient.setQueryData(authKeys.state(), context.previousState)
      }

      // Set error state
      queryClient.setQueryData(authKeys.state(), (old: AuthState = INITIAL_AUTH_STATE) => ({
        ...old,
        isLoading: false,
        error
      }))
    }
  })

  /**
   * Logout mutation
   */
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      Logger.info('[useAuth] Logging out user')
      
      try {
        // Call API to invalidate tokens server-side
        if (authState.tokens?.accessToken) {
          await apiService.post('/auth/logout', {
            refreshToken: authState.tokens.refreshToken
          })
        }
      } catch (error) {
        // Log but don't fail logout for API errors
        Logger.warn('[useAuth] Server logout failed (continuing):', error)
      }
    },
    onMutate: async () => {
      // Immediate UI update
      queryClient.setQueryData(authKeys.state(), (old: AuthState = INITIAL_AUTH_STATE) => ({
        ...old,
        isLoading: true
      }))
    },
    onSettled: async () => {
      try {
        const persister = await getAuthPersisterAsync()
        
        // Clear all auth data
        await persister.clearAll()

        // Reset React Query cache
        queryClient.setQueryData(authKeys.state(), INITIAL_AUTH_STATE)
        queryClient.removeQueries({ queryKey: authKeys.user() })
        queryClient.removeQueries({ queryKey: authKeys.tokens() })

        // Clear any user-specific queries
        queryClient.removeQueries({ 
          predicate: (query) => {
            const key = query.queryKey
            return Array.isArray(key) && (
              key.includes('user') || 
              key.includes('profile') ||
              key.includes('preferences')
            )
          }
        })

        Logger.info('[useAuth] Logout completed successfully')
      } catch (error) {
        Logger.error('[useAuth] Logout cleanup failed:', error)
      }
    }
  })

  /**
   * Token refresh mutation
   */
  const refreshTokenMutation = useMutation({
    mutationFn: async (refreshToken: string): Promise<RefreshTokenResponse> => {
      Logger.debug('[useAuth] Refreshing auth tokens')
      
      try {
        const response = await apiService.post<RefreshTokenResponse>('/auth/refresh', {
          refreshToken
        })

        if (!response || !response.tokens) {
          throw new Error('Invalid refresh response')
        }

        return response
      } catch (error: any) {
        Logger.error('[useAuth] Token refresh failed:', error)
        
        const authError: AuthError = {
          type: error.statusCode === 401 
            ? AuthErrorType.INVALID_TOKEN 
            : AuthErrorType.NETWORK_ERROR,
          message: error.message || 'Token refresh failed',
          statusCode: error.statusCode
        }
        
        throw authError
      }
    },
    onSuccess: async (refreshResponse: RefreshTokenResponse) => {
      try {
        const persister = await getAuthPersisterAsync()
        
        // Update tokens in state
        const updatedState: AuthState = {
          ...authState,
          tokens: refreshResponse.tokens,
          error: null
        }

        // Persist new tokens
        await Promise.all([
          persister.storeTokens(refreshResponse.tokens),
          persister.storeAuthState(updatedState)
        ])

        // Update cache
        queryClient.setQueryData(authKeys.state(), updatedState)
        queryClient.setQueryData(authKeys.tokens(), refreshResponse.tokens)

        Logger.debug('[useAuth] Token refresh successful')
      } catch (error) {
        Logger.error('[useAuth] Failed to persist refreshed tokens:', error)
        throw error
      }
    },
    onError: async (error: AuthError) => {
      Logger.error('[useAuth] Token refresh failed, logging out:', error)
      
      // If refresh fails, logout user
      await logoutMutation.mutateAsync()
    }
  })

  /**
   * Register mutation
   */
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterRequest): Promise<AuthResponse> => {
      Logger.info('[useAuth] Attempting registration for:', userData.email)
      
      try {
        const response = await apiService.post<AuthResponse>('/auth/register', userData)
        
        if (!response || !response.user || !response.tokens) {
          throw new Error('Invalid registration response')
        }

        return response
      } catch (error: any) {
        Logger.error('[useAuth] Registration failed:', error)
        
        const authError: AuthError = {
          type: error.statusCode === 409 
            ? AuthErrorType.USER_NOT_FOUND 
            : AuthErrorType.NETWORK_ERROR,
          message: error.message || 'Registration failed',
          statusCode: error.statusCode
        }
        
        throw authError
      }
    },
    onSuccess: async (authResponse: AuthResponse) => {
      // Same logic as login success
      try {
        const persister = await getAuthPersisterAsync()
        
        const newAuthState: AuthState = {
          user: authResponse.user,
          tokens: authResponse.tokens,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }

        await Promise.all([
          persister.storeTokens(authResponse.tokens),
          persister.storeAuthState(newAuthState)
        ])

        queryClient.setQueryData(authKeys.state(), newAuthState)
        queryClient.setQueryData(authKeys.user(), authResponse.user)
        queryClient.setQueryData(authKeys.tokens(), authResponse.tokens)

        Logger.info('[useAuth] Registration successful for user:', authResponse.user.email)
      } catch (error) {
        Logger.error('[useAuth] Failed to persist registration data:', error)
        throw error
      }
    }
  })

  /**
   * Auto-refresh tokens when needed
   */
  useEffect(() => {
    if (!isReactQueryAuthEnabled || !authState.isAuthenticated || !authState.tokens) {
      return
    }

    const checkTokenRefresh = async () => {
      try {
        const persister = await getAuthPersisterAsync()
        const shouldRefresh = await persister.shouldRefreshTokens()
        
        if (shouldRefresh && authState.tokens?.refreshToken) {
          Logger.debug('[useAuth] Auto-refreshing tokens')
          await refreshTokenMutation.mutateAsync(authState.tokens.refreshToken)
        }
      } catch (error) {
        Logger.error('[useAuth] Auto-refresh check failed:', error)
      }
    }

    // Check immediately and then every 30 seconds
    checkTokenRefresh()
    const interval = setInterval(checkTokenRefresh, 30 * 1000)

    return () => clearInterval(interval)
  }, [authState.isAuthenticated, authState.tokens, isReactQueryAuthEnabled])

  /**
   * Computed values
   */
  const isLoading = useMemo(() => {
    return isStateLoading || 
           loginMutation.isPending || 
           logoutMutation.isPending || 
           refreshTokenMutation.isPending ||
           registerMutation.isPending
  }, [
    isStateLoading,
    loginMutation.isPending,
    logoutMutation.isPending,
    refreshTokenMutation.isPending,
    registerMutation.isPending
  ])

  const error = useMemo(() => {
    return stateError || 
           authState.error || 
           loginMutation.error || 
           registerMutation.error || 
           refreshTokenMutation.error
  }, [
    stateError,
    authState.error,
    loginMutation.error,
    registerMutation.error,
    refreshTokenMutation.error
  ])

  /**
   * Utility functions
   */
  const login = useCallback((credentials: LoginRequest) => {
    return loginMutation.mutateAsync(credentials)
  }, [loginMutation])

  const logout = useCallback(() => {
    return logoutMutation.mutateAsync()
  }, [logoutMutation])

  const register = useCallback((userData: RegisterRequest) => {
    return registerMutation.mutateAsync(userData)
  }, [registerMutation])

  const refreshTokens = useCallback(() => {
    if (!authState.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }
    return refreshTokenMutation.mutateAsync(authState.tokens.refreshToken)
  }, [refreshTokenMutation, authState.tokens])

  // Return the hook API
  return {
    // State
    user: authState.user,
    tokens: authState.tokens,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    logout,
    register,
    refreshTokens,
    refetchAuth,

    // Mutation states for granular loading
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerMutation.isPending,
    isRefreshing: refreshTokenMutation.isPending,

    // Feature flag status
    isReactQueryEnabled: isReactQueryAuthEnabled,
  }
}

/**
 * Hook for checking authentication status only (lightweight)
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth()
  
  return {
    isAuthenticated,
    isLoading,
    isLoggedIn: isAuthenticated && !!user,
    userId: user?.id || null,
  }
}

/**
 * Hook for auth state without actions (read-only)
 */
export function useAuthState() {
  const { user, tokens, isAuthenticated, isLoading, error } = useAuth()
  
  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
  }
}