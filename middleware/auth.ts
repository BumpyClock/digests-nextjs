// ABOUTME: Authentication middleware for protecting routes and managing auth state
// ABOUTME: Integrates with React Query auth system and provides route-level protection

import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/utils/logger'

/**
 * Protected route patterns
 */
const PROTECTED_ROUTES = [
  '/web/settings',
  '/web/profile',
  '/web/billing',
  '/web/notifications',
  '/api/user',
  '/api/feeds',
  '/api/articles'
]

/**
 * Admin-only route patterns
 */
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin'
]

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/pages',
  '/api/auth',
  '/api/public'
]

/**
 * Auth middleware configuration
 */
interface AuthMiddlewareConfig {
  /** Enable authentication middleware */
  enabled: boolean
  /** Redirect URL for unauthenticated users */
  loginUrl: string
  /** Redirect URL for unauthorized users */
  unauthorizedUrl: string
  /** Enable admin route protection */
  enableAdminProtection: boolean
}

/**
 * Default middleware configuration
 */
const DEFAULT_CONFIG: AuthMiddlewareConfig = {
  enabled: process.env.NEXT_PUBLIC_RQ_AUTH === 'true',
  loginUrl: '/web?auth=login',
  unauthorizedUrl: '/web?error=unauthorized',
  enableAdminProtection: true
}

/**
 * Extract auth token from request
 */
function extractAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try auth cookie
  const authCookie = request.cookies.get('auth_token')
  if (authCookie?.value) {
    return authCookie.value
  }

  return null
}

/**
 * Validate JWT token (simplified version - in production use proper JWT library)
 */
async function validateToken(token: string): Promise<{
  valid: boolean
  payload?: any
  error?: string
}> {
  try {
    // In a real implementation, you would:
    // 1. Verify JWT signature
    // 2. Check expiration
    // 3. Validate issuer/audience
    // 4. Check against revocation list
    
    // For now, just check if token exists and has proper format
    if (!token || token.length < 10) {
      return { valid: false, error: 'Invalid token format' }
    }

    // Mock payload extraction (replace with real JWT decode)
    const mockPayload = {
      sub: 'user123',
      email: 'user@example.com',
      role: 'user',
      exp: Date.now() / 1000 + 3600 // 1 hour from now
    }

    // Check expiration
    if (mockPayload.exp < Date.now() / 1000) {
      return { valid: false, error: 'Token expired' }
    }

    return { valid: true, payload: mockPayload }
  } catch (error) {
    Logger.error('[AuthMiddleware] Token validation failed:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route requires admin access
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Check if user has admin role
 */
function isAdmin(payload: any): boolean {
  return payload?.role === 'admin' || payload?.email?.includes('admin')
}

/**
 * Create redirect response with auth state
 */
function createRedirect(url: string, reason?: string): NextResponse {
  const response = NextResponse.redirect(new URL(url))
  
  if (reason) {
    response.headers.set('X-Auth-Redirect-Reason', reason)
  }
  
  return response
}

/**
 * Main authentication middleware
 */
export async function authMiddleware(
  request: NextRequest,
  config: Partial<AuthMiddlewareConfig> = {}
): Promise<NextResponse | null> {
  const middlewareConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Skip if middleware is disabled
  if (!middlewareConfig.enabled) {
    return null
  }

  const { pathname } = request.nextUrl
  
  Logger.debug('[AuthMiddleware] Processing request for:', pathname)

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return null
  }

  // Extract and validate token
  const token = extractAuthToken(request)
  
  if (!token) {
    if (isProtectedRoute(pathname)) {
      Logger.info('[AuthMiddleware] No token found for protected route:', pathname)
      return createRedirect(middlewareConfig.loginUrl, 'no_token')
    }
    return null
  }

  // Validate token
  const validation = await validateToken(token)
  
  if (!validation.valid) {
    Logger.warn('[AuthMiddleware] Invalid token for route:', pathname, validation.error)
    
    if (isProtectedRoute(pathname)) {
      return createRedirect(middlewareConfig.loginUrl, 'invalid_token')
    }
    return null
  }

  // Check admin routes
  if (middlewareConfig.enableAdminProtection && isAdminRoute(pathname)) {
    if (!isAdmin(validation.payload)) {
      Logger.warn('[AuthMiddleware] Non-admin user accessing admin route:', pathname)
      return createRedirect(middlewareConfig.unauthorizedUrl, 'insufficient_permissions')
    }
  }

  // Add user info to headers for downstream processing
  const response = NextResponse.next()
  
  if (validation.payload) {
    response.headers.set('X-User-ID', validation.payload.sub || '')
    response.headers.set('X-User-Email', validation.payload.email || '')
    response.headers.set('X-User-Role', validation.payload.role || 'user')
  }

  Logger.debug('[AuthMiddleware] Request authorized for:', pathname)
  return response
}

/**
 * Middleware for API routes
 */
export async function apiAuthMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return null
  }

  // Allow public API routes
  if (pathname.startsWith('/api/public/') || pathname.startsWith('/api/auth/')) {
    return null
  }

  return authMiddleware(request, {
    loginUrl: '/api/auth/unauthorized',
    unauthorizedUrl: '/api/auth/forbidden'
  })
}

/**
 * Create auth headers for server-side requests
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Extract user info from middleware headers
 */
export function extractUserFromHeaders(headers: Headers): {
  id?: string
  email?: string
  role?: string
} {
  return {
    id: headers.get('X-User-ID') || undefined,
    email: headers.get('X-User-Email') || undefined,
    role: headers.get('X-User-Role') || undefined
  }
}

/**
 * Auth middleware for Next.js app directory
 */
export function withAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Check authentication first
    const authResponse = await authMiddleware(request)
    
    if (authResponse) {
      return authResponse
    }
    
    // Continue with original handler
    return handler(request)
  }
}

/**
 * Utility to check if request is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = extractAuthToken(request)
  
  if (!token) {
    return false
  }
  
  const validation = await validateToken(token)
  return validation.valid
}

/**
 * Utility to get user from request
 */
export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  const token = extractAuthToken(request)
  
  if (!token) {
    return null
  }
  
  const validation = await validateToken(token)
  
  if (!validation.valid) {
    return null
  }
  
  return validation.payload
}