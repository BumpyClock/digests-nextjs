import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { processArticleContent } from "@/components/Feed/ArticleReader";
import { workerService } from "@/services/worker-service";
import type { ReaderViewResponse } from "@/types";
import { hashString } from "@/utils/hash";
import { readerViewKeys } from "./feedsKeys";
import { getValidReaderViewOrThrow } from "./reader-view-validation";

const MAX_CACHE_SIZE = 50;
const readerContentCache = new Map<string, ReturnType<typeof processArticleContent>>();

function setCachedReaderContent(key: string, value: ReturnType<typeof processArticleContent>) {
  if (readerContentCache.size >= MAX_CACHE_SIZE) {
    const firstKey = readerContentCache.keys().next().value;
    if (firstKey !== undefined) {
      readerContentCache.delete(firstKey);
    }
  }
  readerContentCache.set(key, value);
}

function getCachedReaderContent(key: string) {
  return readerContentCache.get(key);
}

export const readerViewQueryByUrl = (url: string): UseQueryOptions<ReaderViewResponse> => {
  return {
    queryKey: readerViewKeys.byUrl(url),
    queryFn: async () => {
      const result = await workerService.fetchReaderView(url);
      return getValidReaderViewOrThrow(result, url);
    },
    staleTime: 60 * 60 * 1000, // 1 hour - articles don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    retry: 2, // Retry failed requests twice
  };
};

// Reader view query for individual articles
export const useReaderViewQuery = (url: string) => {
  return useQuery({
    ...readerViewQueryByUrl(url),
    enabled: !!url, // Only run when URL is provided
  });
};

export const useReaderView = (url: string, isOpen?: boolean) => {
  const query = useReaderViewQuery(url);
  const readerView = query.data ?? null;

  const cacheKey = useMemo(() => {
    if (!readerView) return null;
    return hashString(`${readerView.url}::${readerView.content}::${readerView.markdown}`);
  }, [readerView]);

  const processed = useMemo(() => {
    if (!readerView) {
      return {
        htmlContent: "",
        markdownContent: "",
      };
    }

    if (!cacheKey) {
      return processArticleContent(readerView);
    }

    const cached = getCachedReaderContent(cacheKey);
    if (cached) {
      return cached;
    }

    const next = processArticleContent(readerView);
    setCachedReaderContent(cacheKey, next);
    return next;
  }, [cacheKey, readerView]);

  return {
    ...query,
    readerView,
    loading: (isOpen === false ? query.isLoading : query.isLoading || query.isFetching) && !!url,
    cleanedContent: processed.htmlContent,
    cleanedMarkdown: processed.markdownContent,
    extractedAuthor: processed.extractedAuthor,
  };
};
