"use client";

import { QueryClient } from "@tanstack/react-query";

// Create a function that returns a new QueryClient instance
// This ensures we don't share state between server and client
function makeQueryClient() {
  const ttl = Number(process.env.NEXT_PUBLIC_WORKER_CACHE_TTL);
  const staleTimeMs = Number.isFinite(ttl) && ttl > 0 ? ttl : 15 * 60 * 1000;
  const gcTimeMs = staleTimeMs * 2;

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimeMs,
        gcTime: gcTimeMs,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Create or return the singleton QueryClient for browser
export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
