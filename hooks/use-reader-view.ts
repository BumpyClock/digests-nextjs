import { useState, useEffect } from "react";
import { ReaderViewResponse, FeedItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { workerService } from "@/services/worker-service";
import { getApiConfig } from "@/store/useApiConfigStore";
import { processArticleContent } from "@/components/Feed/ArticleReader";

const MAX_CACHE_SIZE = 50;
const readerViewCache = new Map<string, ReaderViewResponse>();
const readerContentCache = new Map<
  string,
  ReturnType<typeof processArticleContent>
>();

function setCachedContent(key: string, value: ReturnType<typeof processArticleContent>) {
  if (readerContentCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = readerContentCache.keys().next().value;
    if (firstKey !== undefined) readerContentCache.delete(firstKey);
  }
  readerContentCache.set(key, value);
}

function setCachedReaderView(key: string, value: ReaderViewResponse) {
  if (readerViewCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = readerViewCache.keys().next().value;
    if (firstKey !== undefined) readerViewCache.delete(firstKey);
  }
  readerViewCache.set(key, value);
}

export function useReaderView(feedItem: FeedItem | null, isOpen?: boolean) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [cleanedContent, setCleanedContent] = useState("");
  const [cleanedMarkdown, setCleanedMarkdown] = useState("");
  const [extractedAuthor, setExtractedAuthor] = useState<
    { name: string; image?: string } | undefined
  >();
  const { toast } = useToast();
  const feedItemLink = feedItem?.link;

  // Reset state when feedItem changes
  useEffect(() => {
    setReaderView(null);
    setLoading(false);
    setHasAttemptedFetch(false);
    setCleanedContent("");
    setCleanedMarkdown("");
    setExtractedAuthor(undefined);
    if (!feedItemLink) {
      return;
    }
  }, [feedItemLink]);

  // Process content when readerView changes
  useEffect(() => {
    if (readerView) {
      const contentCacheKey = `${readerView.url}::${readerView.content.length}::${readerView.markdown.length}`;
      const cachedContent = readerContentCache.get(contentCacheKey);

      if (cachedContent) {
        setCleanedContent(cachedContent.htmlContent);
        setCleanedMarkdown(cachedContent.markdownContent);
        setExtractedAuthor(cachedContent.extractedAuthor);
        return;
      }

      const processed = processArticleContent(readerView);
      setCachedContent(contentCacheKey, processed);
      setCleanedContent(processed.htmlContent);
      setCleanedMarkdown(processed.markdownContent);
      setExtractedAuthor(processed.extractedAuthor);
    } else {
      setCleanedContent("");
      setCleanedMarkdown("");
      setExtractedAuthor(undefined);
    }
  }, [readerView]);

  // Load reader view
  useEffect(() => {
    // Skip if modal is closed or no feedItem
    if (isOpen === false || !feedItemLink) return;
    const link = feedItemLink;
    const apiBaseUrl = getApiConfig().baseUrl;
    const cacheKey = `${apiBaseUrl}::${link}`;

    // Check cache first
    const cached = readerViewCache.get(cacheKey);
    if (cached) {
      setLoading(true);
      setReaderView(cached);
      setHasAttemptedFetch(true);
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    let didCancel = false;

    async function loadReaderView() {
      setHasAttemptedFetch(true);
      setLoading(true);

      try {
        const result = await workerService.fetchReaderView(link);

        if (result.success && result.data.length > 0 && result.data[0].status === "ok") {
          if (didCancel) return;
          setCachedReaderView(cacheKey, result.data[0]);
          setReaderView(result.data[0]);
        } else {
          throw new Error(result.message || "Failed to load reader view");
        }
      } catch (error) {
        if (didCancel) return;
        console.error("Error fetching reader view:", error);
        toast({
          title: "Error",
          description: "Failed to load reader view. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!didCancel) {
          setLoading(false);
        }
      }
    }

    loadReaderView();
    return () => {
      didCancel = true;
    };
  }, [feedItemLink, toast, isOpen]);

  const shouldShowLoading =
    loading || (isOpen !== false && !!feedItem && !readerView && !hasAttemptedFetch);

  return { readerView, loading: shouldShowLoading, cleanedContent, cleanedMarkdown, extractedAuthor };
}
