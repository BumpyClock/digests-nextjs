"use client";

import { memo } from "react";
import { FeedItem, ReaderViewResponse } from "@/types";
import { ReaderLayout } from "@/types/reader";
import { useIsMobile } from "@/hooks/use-media-query";
import { ArticleHeader, ArticleContent } from "@/components/Feed/ArticleReader";

interface ReaderContentProps {
  feedItem: FeedItem;
  readerView: ReaderViewResponse | null;
  loading: boolean;
  cleanedContent: string;
  cleanedMarkdown?: string;
  extractedAuthor?: { name: string; image?: string };
  layout?: ReaderLayout;
  parallaxOffset?: number;
  className?: string;
  transitionInProgress?: boolean;
  useViewTransition?: boolean;
}

export const ReaderContent = memo(function ReaderContent({
  feedItem,
  readerView,
  loading,
  cleanedContent,
  layout = "standard",
  parallaxOffset,
  className = "",
  cleanedMarkdown,
  extractedAuthor,
  transitionInProgress = false,
  useViewTransition = false,
}: ReaderContentProps) {
  const isMobile = useIsMobile();
  const isCompact = layout === "compact" || (isMobile && layout === "standard");
  const deferBodyMount = layout === "modal" && transitionInProgress;

  if (!readerView && !loading) {
    return (
      <div className="p-6 text-center">
        <p>Failed to load content. Please try again.</p>
      </div>
    );
  }

  // Use increased padding for modal layout
  const containerPadding =
    layout === "modal" ? "px-2 py-2 md:px-6 md:py-2 lg:px-2" : isCompact ? "px-3 py-4" : "p-2";

  return (
    <div className={`${containerPadding} ${className}`}>
      <article>
        <ArticleHeader
          feedItem={feedItem}
          readerView={readerView}
          parallaxOffset={parallaxOffset}
          layout={layout}
          loading={loading}
          extractedAuthor={extractedAuthor}
          disableTransitionEffectsDuringWindow={transitionInProgress}
          disableEntranceAnimations={layout === "modal" && useViewTransition}
        />
        {deferBodyMount ? (
          <div
            aria-hidden="true"
            className={`mt-8 space-y-4 ${isMobile ? "max-w-full" : "md:max-w-4xl"}`}
          >
            <div className="h-5 w-4/5 rounded-md bg-muted/70" />
            <div className="h-4 w-full rounded-md bg-muted/60" />
            <div className="h-4 w-11/12 rounded-md bg-muted/60" />
            <div className="h-4 w-10/12 rounded-md bg-muted/60" />
            <div className="h-4 w-9/12 rounded-md bg-muted/60" />
          </div>
        ) : (
          <ArticleContent
            content={cleanedContent}
            markdown={cleanedMarkdown ?? readerView?.markdown}
            className={`w-full ${isMobile ? "max-w-full" : "md:max-w-4xl"} ${
              layout === "modal" ? "no-animation" : ""
            }`}
            loading={loading}
            disableEntranceAnimation={layout === "modal" && useViewTransition}
          />
        )}
      </article>
    </div>
  );
});
