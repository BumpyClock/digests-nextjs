"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Only load ReactQueryDevtools in development
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  {
    ssr: false, // Don't render on server
  },
);

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Provides a React Query context and optionally includes React Query Devtools in development environments.
 *
 * Wraps child components with a {@link QueryClientProvider}, supplying a query client instance for React Query state management. In development mode, also renders the {@link ReactQueryDevtools} panel.
 *
 * @param children - The React elements to be rendered within the provider.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new QueryClient instance for this provider
  const [queryClient] = useState(() => getQueryClient());

  // Restore persisted data on mount
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "restorePersistedData" in queryClient
    ) {
      console.log("[QueryProvider] Restoring persisted data on mount...");
      const persistedClient = queryClient as typeof queryClient & {
        restorePersistedData: () => Promise<void>;
      };
      persistedClient.restorePersistedData().catch((error: Error) => {
        console.error(
          "[QueryProvider] Failed to restore persisted data:",
          error,
        );
      });
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
