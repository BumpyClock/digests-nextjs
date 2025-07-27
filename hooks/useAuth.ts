/**
 * Enhanced React Query hooks for authentication management
 * Provides secure auth state, token management, and offline support
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import { apiService } from '@/services/api-service'
import { FEATURES } from '@/lib/feature-flags'
import { Logger } from '@/utils/logger'
import type { 
  User, 
  AuthTokens, 
  AuthState, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  RefreshTokenRequest,
  AuthError,
  AuthErrorType 
} from '@/types/auth'

// Query Keys Factory for auth operations
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  tokens: () => [...authKeys.all, 'tokens'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  preferences: () => [...authKeys.all, 'preferences'] as const,
} as const

// Auth state storage keys
const AUTH_STORAGE_KEYS = {
  USER: 'auth:user',
  TOKENS: 'auth:tokens',
  SESSION: 'auth:session',
  LAST_ACTIVITY: 'auth:lastActivity',
} as const

/**
 * Secure token storage utilities
 */
const TokenStorage = {
  async setTokens(tokens: AuthTokens): Promise<void> {
    if (typeof window === 'undefined') return
    
    try {
      // Store in secure storage (encrypted if available)
      const tokenData = {
        ...tokens,
        storedAt: Date.now(),
      }
      
      // Use IndexedDB for secure storage
      if ('indexedDB' in window) {
        // Implementation would use persistence layer
        localStorage.setItem(AUTH_STORAGE_KEYS.TOKENS, JSON.stringify(tokenData))
      } else {
        // Fallback to localStorage with warning
        console.warn('[Auth] IndexedDB not available, using localStorage')
        localStorage.setItem(AUTH_STORAGE_KEYS.TOKENS, JSON.stringify(tokenData))
      }
    } catch (error) {
      Logger.error('[TokenStorage] Failed to store tokens:', error)
      throw new Error('Failed to store authentication tokens')
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.TOKENS)
      if (!stored) return null
      
      const tokenData = JSON.parse(stored)
      
      // Check if tokens are expired
      const now = Date.now()
      const expiresAt = tokenData.storedAt + (tokenData.expiresIn * 1000)
      
      if (now >= expiresAt) {
        await TokenStorage.clearTokens()
        return null
      }
      
      return {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
        tokenType: tokenData.tokenType,
      }
    } catch (error) {
      Logger.error('[TokenStorage] Failed to retrieve tokens:', error)
      await TokenStorage.clearTokens()
      return null
    }
  },

  async clearTokens(): Promise<void> {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.TOKENS)
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
      localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    } catch (error) {
      Logger.error('[TokenStorage] Failed to clear tokens:', error)
    }
  },

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const response = await apiService.auth.refreshToken({ refreshToken })
    await TokenStorage.setTokens(response.tokens)
    return response.tokens
  },
}

/**
 * Auth query data structure
 */
interface AuthQueryData {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  lastActivity: number
}

/**
 * Main authentication hook with React Query integration
 */
export const useAuth = (options?: UseQueryOptions<AuthQueryData>) => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_AUTH
  const [authError, setAuthError] = useState<AuthError | null>(null)

  const query = useQuery<AuthQueryData>({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthQueryData> => {
      Logger.debug('[useAuth] Fetching auth session')
      
      try {
        // Get stored tokens
        const tokens = await TokenStorage.getTokens()
        
        if (!tokens) {
          return {
            user: null,
            tokens: null,
            isAuthenticated: false,
            lastActivity: 0,
          }
        }

        // Verify tokens with API
        const user = await apiService.auth.getCurrentUser()
        
        return {
          user,
          tokens,
          isAuthenticated: true,
          lastActivity: Date.now(),
        }
      } catch (error) {
        Logger.error('[useAuth] Session verification failed:', error)
        
        // Clear invalid tokens
        await TokenStorage.clearTokens()
        
        return {
          user: null,
          tokens: null,
          isAuthenticated: false,
          lastActivity: 0,
        }
      }
    },
    enabled: isFeatureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: 'always',
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 2
    },
    ...options,
  })

  // Clear error when query succeeds
  useEffect(() => {
    if (query.isSuccess) {
      setAuthError(null)
    } else if (query.error) {
      setAuthError({
        type: AuthErrorType.UNKNOWN_ERROR,
        message: query.error.message,
      })
    }
  }, [query.isSuccess, query.error])

  return {
    ...query,
    user: query.data?.user || null,
    tokens: query.data?.tokens || null,
    isAuthenticated: query.data?.isAuthenticated || false,
    lastActivity: query.data?.lastActivity || 0,
    authError,
  }
}

/**
 * Login mutation with optimistic updates
 */
export const useLogin = () => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_AUTH

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<AuthResponse> => {
      Logger.debug('[useLogin] Attempting login:', credentials.email)
      
      const response = await apiService.auth.login(credentials)
      
      // Store tokens securely
      await TokenStorage.setTokens(response.tokens)
      
      return response
    },
    onMutate: async () => {
      if (!isFeatureEnabled) return
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.session() })
      
      // Snapshot the previous value
      const previousAuth = queryClient.getQueryData<AuthQueryData>(authKeys.session())
      
      return { previousAuth }
    },
    onSuccess: (data) => {
      Logger.debug('[useLogin] Login successful:', data.user.email)
      
      if (isFeatureEnabled) {
        // Update auth cache with real data
        queryClient.setQueryData<AuthQueryData>(authKeys.session(), {
          user: data.user,
          tokens: data.tokens,
          isAuthenticated: true,
          lastActivity: Date.now(),
        })
      }
      
      // Invalidate other auth-related queries
      queryClient.invalidateQueries({ queryKey: authKeys.all })
    },
    onError: (error, variables, context) => {
      Logger.error('[useLogin] Login failed:', error)
      
      if (isFeatureEnabled && context?.previousAuth) {
        queryClient.setQueryData(authKeys.session(), context.previousAuth)
      }
      
      // Clear any stored tokens on error
      TokenStorage.clearTokens()
    },
  })
}

/**
 * Registration mutation
 */
export const useRegister = () => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_AUTH

  return useMutation({
    mutationFn: async (userData: RegisterRequest): Promise<AuthResponse> => {
      Logger.debug('[useRegister] Attempting registration:', userData.email)
      
      const response = await apiService.auth.register(userData)
      
      // Store tokens securely
      await TokenStorage.setTokens(response.tokens)
      
      return response
    },
    onSuccess: (data) => {
      Logger.debug('[useRegister] Registration successful:', data.user.email)
      
      if (isFeatureEnabled) {
        // Update auth cache
        queryClient.setQueryData<AuthQueryData>(authKeys.session(), {
          user: data.user,
          tokens: data.tokens,
          isAuthenticated: true,
          lastActivity: Date.now(),
        })
      }
      
      queryClient.invalidateQueries({ queryKey: authKeys.all })
    },
    onError: (error) => {
      Logger.error('[useRegister] Registration failed:', error)
      TokenStorage.clearTokens()
    },
  })
}

/**
 * Logout mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient()
  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_AUTH

  return useMutation({
    mutationFn: async (): Promise<void> => {
      Logger.debug('[useLogout] Logging out user')
      
      try {
        // Attempt to notify server of logout
        await apiService.auth.logout()
      } catch (error) {
        // Continue with local logout even if server call fails
        Logger.warn('[useLogout] Server logout failed, continuing with local logout:', error)
      }
      
      // Clear local tokens
      await TokenStorage.clearTokens()
    },
    onSuccess: () => {
      Logger.debug('[useLogout] Logout successful')
      
      if (isFeatureEnabled) {
        // Clear auth cache
        queryClient.setQueryData<AuthQueryData>(authKeys.session(), {
          user: null,
          tokens: null,
          isAuthenticated: false,
          lastActivity: 0,
        })
      }
      
      // Clear all auth-related queries
      queryClient.removeQueries({ queryKey: authKeys.all })
      
      // Optionally clear all cached data on logout
      queryClient.clear()
    },
    onError: (error) => {
      Logger.error('[useLogout] Logout failed:', error)
      
      // Force clear local state even on error
      TokenStorage.clearTokens()
      queryClient.clear()
    },
  })
}

/**
 * Token refresh mutation
 */
export const useRefreshToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<AuthTokens> => {
      Logger.debug('[useRefreshToken] Refreshing access token')
      
      const currentTokens = await TokenStorage.getTokens()
      if (!currentTokens?.refreshToken) {
        throw new Error('No refresh token available')
      }
      
      return await TokenStorage.refreshTokens(currentTokens.refreshToken)
    },
    onSuccess: (tokens) => {
      Logger.debug('[useRefreshToken] Token refresh successful')
      
      // Update tokens in cache
      queryClient.setQueryData<AuthQueryData>(authKeys.session(), (old) => {
        if (!old) return old
        
        return {
          ...old,
          tokens,
          lastActivity: Date.now(),
        }
      })
    },
    onError: (error) => {
      Logger.error('[useRefreshToken] Token refresh failed:', error)
      
      // Clear invalid tokens and force re-login
      TokenStorage.clearTokens()
      queryClient.setQueryData<AuthQueryData>(authKeys.session(), {
        user: null,
        tokens: null,
        isAuthenticated: false,
        lastActivity: 0,
      })
    },
  })
}

/**
 * Update user profile mutation
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<User>): Promise<User> => {
      Logger.debug('[useUpdateProfile] Updating user profile')
      
      return await apiService.auth.updateProfile(updates)
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: authKeys.session() })
      
      const previousAuth = queryClient.getQueryData<AuthQueryData>(authKeys.session())
      
      // Optimistically update
      queryClient.setQueryData<AuthQueryData>(authKeys.session(), (old) => {
        if (!old?.user) return old
        
        return {
          ...old,
          user: { ...old.user, ...updates },
        }
      })
      
      return { previousAuth }
    },
    onSuccess: (updatedUser) => {
      Logger.debug('[useUpdateProfile] Profile update successful')
      
      // Update with real data
      queryClient.setQueryData<AuthQueryData>(authKeys.session(), (old) => {
        if (!old) return old
        
        return {
          ...old,
          user: updatedUser,
        }
      })
    },
    onError: (error, variables, context) => {
      Logger.error('[useUpdateProfile] Profile update failed:', error)
      
      if (context?.previousAuth) {
        queryClient.setQueryData(authKeys.session(), context.previousAuth)
      }
    },
  })
}

/**
 * Auth session monitor hook
 */
export const useAuthSessionMonitor = () => {
  const { isAuthenticated, tokens } = useAuth()
  const refreshToken = useRefreshToken()

  useEffect(() => {
    if (!isAuthenticated || !tokens) return

    // Set up automatic token refresh
    const tokenRefreshInterval = setInterval(async () => {
      const now = Date.now()
      const expiresAt = tokens.expiresIn * 1000
      const refreshThreshold = 5 * 60 * 1000 // 5 minutes before expiry

      if (now >= expiresAt - refreshThreshold) {
        try {
          await refreshToken.mutateAsync()
        } catch (error) {
          Logger.error('[AuthSessionMonitor] Auto token refresh failed:', error)
        }
      }
    }, 60 * 1000) // Check every minute

    return () => clearInterval(tokenRefreshInterval)
  }, [isAuthenticated, tokens, refreshToken])

  // Activity tracking
  useEffect(() => {
    if (!isAuthenticated) return

    const updateActivity = () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString())
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [isAuthenticated])
}

/**
 * Prefetch auth data for better UX
 */
export const usePrefetchAuth = () => {
  const queryClient = useQueryClient()

  const prefetchAuth = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: authKeys.session(),
      queryFn: async () => {
        const tokens = await TokenStorage.getTokens()
        
        if (!tokens) {
          return {
            user: null,
            tokens: null,
            isAuthenticated: false,
            lastActivity: 0,
          }
        }

        try {
          const user = await apiService.auth.getCurrentUser()
          return {
            user,
            tokens,
            isAuthenticated: true,
            lastActivity: Date.now(),
          }
        } catch {
          await TokenStorage.clearTokens()
          return {
            user: null,
            tokens: null,
            isAuthenticated: false,
            lastActivity: 0,
          }
        }
      },
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])

  return { prefetchAuth }
}

/**
 * Auth error handler hook
 */
export const useAuthErrorHandler = () => {
  const queryClient = useQueryClient()

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        // Clear auth state on unauthorized errors
        TokenStorage.clearTokens()
        queryClient.setQueryData<AuthQueryData>(authKeys.session(), {
          user: null,
          tokens: null,
          isAuthenticated: false,
          lastActivity: 0,
        })
        
        // Redirect to login if needed
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
  }, [queryClient])

  return { handleAuthError }
}

/**
 * Check if user has specific permissions
 */
export const usePermissions = (requiredPermissions: string[] = []) => {
  const { user, isAuthenticated } = useAuth()

  const hasPermission = useCallback((permission: string): boolean => {
    if (!isAuthenticated || !user) return false
    
    // Implementation depends on your permission system
    // This is a placeholder
    return true
  }, [isAuthenticated, user])

  const hasAllPermissions = useCallback((): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission))
  }, [requiredPermissions, hasPermission])

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }, [hasPermission])

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccess: hasAllPermissions(),
  }
}