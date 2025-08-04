import { useState, useEffect } from "react";
import { ReaderViewResponse, FeedItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { workerService } from "@/services/worker-service";
import { processArticleContent } from "@/components/Feed/ArticleReader/ArticleReader";

export function useReaderView(feedItem: FeedItem | null, isOpen?: boolean) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanedContent, setCleanedContent] = useState("");
  const [cleanedMarkdown, setCleanedMarkdown] = useState("");
  const [extractedAuthor, setExtractedAuthor] = useState<
    { name: string; image?: string } | undefined
  >();
  const { toast } = useToast();

  // Reset state when feedItem changes
  useEffect(() => {
    if (!feedItem) {
      setReaderView(null);
      setCleanedContent("");
      setCleanedMarkdown("");
      setExtractedAuthor(undefined);
      return;
    }
  }, [feedItem]);

  // Process content when readerView changes
  useEffect(() => {
    if (readerView) {
      const {
        htmlContent,
        markdownContent,
        extractedAuthor: author,
      } = processArticleContent(readerView);
      setCleanedContent(htmlContent);
      setCleanedMarkdown(markdownContent);
      setExtractedAuthor(author);
    } else {
      setCleanedContent("");
      setCleanedMarkdown("");
      setExtractedAuthor(undefined);
    }
  }, [readerView]);

  // Load reader view
  useEffect(() => {
    // Skip if modal is closed or no feedItem
    if (isOpen === false || !feedItem) return;

    const feedItemLink = feedItem.link;

    async function loadReaderView() {
      setLoading(true);

      try {
        const result = await workerService.fetchReaderView(feedItemLink);

        if (
          result.success &&
          result.data.length > 0 &&
          result.data[0].status === "ok"
        ) {
          setReaderView(result.data[0]);
        } else {
          throw new Error(result.message || "Failed to load reader view");
        }
      } catch (error) {
        console.error("Error fetching reader view:", error);
        toast({
          title: "Error",
          description: "Failed to load reader view. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadReaderView();
  }, [feedItem, toast, isOpen]);

  return {
    readerView,
    loading,
    cleanedContent,
    cleanedMarkdown,
    extractedAuthor,
  };
}
