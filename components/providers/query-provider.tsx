"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import localforage from "localforage";

// Only load ReactQueryDevtools in development
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  {
    ssr: false, // Don't render on server
  }
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

  // Persist React Query cache to localforage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ttl = Number(process.env.NEXT_PUBLIC_WORKER_CACHE_TTL);
    const staleTimeMs = Number.isFinite(ttl) && ttl > 0 ? ttl : 15 * 60 * 1000;
    const maxAge = staleTimeMs * 2;

    const persister = {
      persistClient: async (client: unknown) => {
        await localforage.setItem("rq-cache", JSON.stringify(client));
      },
      restoreClient: async () => {
        const cached = await localforage.getItem<string>("rq-cache");
        return cached ? JSON.parse(cached) : undefined;
      },
      removeClient: async () => {
        await localforage.removeItem("rq-cache");
      },
    };

    persistQueryClient({ queryClient, persister, maxAge });

    if (process.env.NODE_ENV === "development") {
      // Dev metric: log cache sizes after hydration
      Promise.all([
        localforage.getItem<string>("rq-cache"),
        localforage.getItem<string>("digests-feed-store"),
      ])
        .then(([rq, zustand]) => {
          const rqBytes = rq ? new Blob([rq]).size : 0;
          const zsBytes = zustand ? new Blob([zustand]).size : 0;
          console.debug("[Persist][RQ] bytes:", rqBytes);
          console.debug("[Persist][Zustand] bytes:", zsBytes);
        })
        .catch(() => void 0);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
