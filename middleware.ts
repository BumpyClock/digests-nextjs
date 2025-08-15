// ABOUTME: Next.js middleware - simplified without authentication
// ABOUTME: Auth removed - just passes through all requests

import { NextRequest, NextResponse } from "next/server";
// Auth middleware removed - no authentication needed

/**
 * Main Next.js middleware function
 * No authentication - allows all requests through
 */
export async function middleware(request: NextRequest) {
  // No auth needed - continue with normal processing
  return NextResponse.next();
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
    "/((?!_next/static|_next/image|favicon.ico|public|manifest.json|logo192.png).*)",
  ],
};
