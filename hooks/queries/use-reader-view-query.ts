import { useQuery } from '@tanstack/react-query'
import { workerService } from '@/services/worker-service'
import type { ReaderViewResponse } from '@/types'

// Query keys for reader view
export const readerViewKeys = {
  all: ['readerView'] as const,
  byUrl: (url: string) => [...readerViewKeys.all, url] as const,
} as const

// Reader view query for individual articles
export const useReaderViewQuery = (url: string) => {
  return useQuery({
    queryKey: readerViewKeys.byUrl(url),
    queryFn: async (): Promise<ReaderViewResponse> => {
      const result = await workerService.fetchReaderView(url)
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch reader view')
      }
      return result.data[0] // Single article
    },
    enabled: !!url, // Only run when URL is provided
    staleTime: 60 * 60 * 1000, // 1 hour - articles don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    retry: 2, // Retry failed requests twice
  })
}