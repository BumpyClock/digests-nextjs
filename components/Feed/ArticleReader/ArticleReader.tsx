"use client";

import { memo, useEffect } from "react";
import "./ArticleReader.css";
import type { FeedItem, ReaderViewResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanupModalContent } from "@/utils/htmlUtils";
import { cleanupMarkdownContent } from "@/utils/imageDeduplicator";
import { useIsMobile } from "@/hooks/use-media-query";
import { motion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";

// Import extracted components
import { ArticleHeader } from "./ArticleHeader";
import { ArticleContent } from "./ArticleContent";
import { ArticleMetadata } from "./ArticleMetadata";
import { ArticleActions } from "./ArticleActions";
import { useArticleActions } from "./hooks/use-article-actions";

interface ArticleReaderProps {
  feedItem: FeedItem;
  readerView: ReaderViewResponse | null;
  layout?: "standard" | "compact" | "modal";
  loading?: boolean;
}

/**
 * Main article reader component (simplified to ~150 lines)
 * Coordinates child components and manages high-level state
 * Refactored to follow Single Responsibility Principle
 */
export const ArticleReader = memo<ArticleReaderProps>(
  ({ feedItem, readerView, layout = "standard", loading = false }) => {
    const { isInReadLater, toggleReadLater, markAsRead } = useArticleActions({
      itemId: feedItem.id,
    });

    // Mark as read when component mounts
    useEffect(() => {
      markAsRead();
    }, [markAsRead]);

    const isModal = layout === "modal";

    // Process content and extract author metadata
    const { htmlContent, markdownContent, extractedAuthor } = processArticleContent(readerView);

    // Render actions component
    const actionsComponent = (
      <ArticleActions
        item={{
          id: feedItem.id,
          title: feedItem.title,
          description: feedItem.description,
          link: feedItem.link,
        }}
        isInReadLater={isInReadLater}
        onReadLaterToggle={toggleReadLater}
        layout={layout}
      />
    );

    return (
      <div className={`article-reader ${isModal ? "article-reader--modal" : ""}`}>
        <ArticleHeader
          feedItem={feedItem}
          readerView={readerView}
          showThumbnail={!!feedItem.thumbnail}
          layout={layout}
          loading={loading}
          extractedAuthor={extractedAuthor}
          actions={actionsComponent}
        />

        <div className="article-reader__body">
          {/* Metadata Section */}
          {loading ? (
            <Skeleton className="h-4 w-32 mb-6" />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: motionTokens.duration.slow,
                delay: motionTokens.duration.normal,
              }}
            >
              <ArticleMetadata
                author={extractedAuthor}
                published={feedItem.published}
                content={htmlContent}
                markdown={markdownContent}
                layout={layout}
                className="mb-6"
              />
            </motion.div>
          )}

          {/* Content Section */}
          <ArticleContent content={htmlContent} markdown={markdownContent} loading={loading} />
        </div>
      </div>
    );
  }
);

ArticleReader.displayName = "ArticleReader";

/**
 * Processes article content and extracts metadata
 * @param readerView - Reader view response data
 * @returns Processed content and extracted metadata
 */
export function processArticleContent(readerView: ReaderViewResponse | null): {
  htmlContent: string;
  markdownContent: string;
  extractedAuthor?: { name: string; image?: string };
} {
  if (!readerView) return { htmlContent: "", markdownContent: "" };

  const thumbnailUrl = readerView.image;

  // Process HTML content
  const htmlContent = readerView.content
    ? cleanupModalContent(readerView.content, thumbnailUrl)
    : "";

  // Process markdown content with comprehensive cleanup (metadata + image deduplication)
  const markdownResult = readerView.markdown
    ? cleanupMarkdownContent(
        readerView.markdown,
        thumbnailUrl,
        readerView.title,
        undefined, // author not available in ReaderViewResponse
        readerView.siteName
      )
    : { cleanedMarkdown: "" };

  return {
    htmlContent,
    markdownContent: markdownResult.cleanedMarkdown,
    extractedAuthor: markdownResult.extractedAuthor,
  };
}

/**
 * Loading skeleton for article reader
 * @param compact - Whether to use compact layout
 */
export const LoadingSkeleton = memo(({ compact }: { compact?: boolean }) => (
  <div className="space-y-4 p-4">
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-4 w-32" />
    {!compact && <Skeleton className="h-[200px] w-full rounded-lg" />}
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

/**
 * Empty state component for when no article is selected
 */
export const EmptyState = memo(() => {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex flex-col items-center justify-center h-full p-4 ${isMobile ? "p-4" : "p-8"}`}
    >
      <div className={`text-center ${isMobile ? "w-full" : "max-w-md"}`}>
        <h3 className={`${isMobile ? "text-title" : "text-title-large"} mb-2`}>
          Select an article
        </h3>
        <p className="text-body-small text-secondary-content">
          Choose an article from the list to view its content here.
        </p>
      </div>
    </div>
  );
});
EmptyState.displayName = "EmptyState";
