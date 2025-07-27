// ABOUTME: Next.js middleware for authentication and route protection
// ABOUTME: Integrates with React Query auth system and provides automatic route protection

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, apiAuthMiddleware } from '@/middleware/auth'

/**
 * Main Next.js middleware function
 * Routes requests to appropriate auth middleware based on path
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    const response = await apiAuthMiddleware(request)
    if (response) {
      return response
    }
  }

  // Handle app routes
  const response = await authMiddleware(request)
  if (response) {
    return response
  }

  // Continue with normal processing
  return NextResponse.next()
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|manifest.json|logo192.png).*)',
  ],
}