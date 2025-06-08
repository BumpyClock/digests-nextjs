'use client'

import { QueryClient } from '@tanstack/react-query'

// Create a function that returns a new QueryClient instance
// This ensures we don't share state between server and client
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - RSS feeds don't change rapidly
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
        retry: 2, // Retry failed requests twice
        refetchOnWindowFocus: false, // Don't refetch on window focus for RSS app
        refetchOnReconnect: true, // Do refetch when network reconnects
        refetchOnMount: true, // Refetch when component mounts
      },
      mutations: {
        retry: 1, // Retry mutations once
        // Global error handling for mutations can be added here
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

// Create or return the singleton QueryClient for browser
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}