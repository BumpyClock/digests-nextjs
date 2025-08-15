import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api-service";
import type { ReaderViewResponse } from "@/types";

// Query keys for reader view
export const readerViewKeys = {
  all: ["readerView"] as const,
  byUrl: (url: string) => [...readerViewKeys.all, url] as const,
} as const;

// Reader view query for individual articles
export const useReaderViewQuery = (url: string) => {
  return useQuery({
    queryKey: readerViewKeys.byUrl(url),
    queryFn: async (): Promise<ReaderViewResponse> => {
      const result = await apiService.fetchReaderView(url);
      return result; // Already returns single article
    },
    enabled: !!url, // Only run when URL is provided
    staleTime: 60 * 60 * 1000, // 1 hour - articles don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    retry: 2, // Retry failed requests twice
  });
};

// Hook for prefetching reader view (used on hover)
export const usePrefetchReaderView = () => {
  return (url: string) => {
    // This would be used by the QueryClient to prefetch
    // Implementation would be in the component that uses it
    return readerViewKeys.byUrl(url);
  };
};
