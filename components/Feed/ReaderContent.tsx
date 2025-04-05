"use client";

import { memo } from "react";
import { FeedItem, ReaderViewResponse } from "@/types";
import { ReaderLayout } from "@/types/reader";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  ArticleHeader,
  ArticleContent,
  LoadingSkeleton
} from "@/components/Feed/ArticleReader/ArticleReader";

interface ReaderContentProps {
  feedItem: FeedItem;
  readerView: ReaderViewResponse | null;
  loading: boolean;
  cleanedContent: string;
  layout?: ReaderLayout;
  parallaxOffset?: number;
  className?: string;
}

export const ReaderContent = memo(function ReaderContent({
  feedItem,
  readerView,
  loading,
  cleanedContent,
  layout = "standard",
  parallaxOffset,
  className = ""
}: ReaderContentProps) {
  const isMobile = useIsMobile();
  const isCompact = layout === "compact" || (isMobile && layout === "standard");
  
  if (loading) {
    return <LoadingSkeleton compact={isCompact} />;
  }
  
  if (!readerView) {
    return (
      <div className="p-6 text-center">
        <p>Failed to load content. Please try again.</p>
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'px-3 py-4' : 'p-4'} ${className}`}>
      <article>
        <ArticleHeader 
          feedItem={feedItem} 
          readerView={readerView} 
          parallaxOffset={parallaxOffset}
          layout={layout}
        />
        <ArticleContent 
          content={cleanedContent} 
          className={`w-full ${isMobile ? 'max-w-full' : 'md:max-w-4xl'} ${layout === "modal" ? 'no-animation' : ''}`}
        />
      </article>
    </div>
  );
}); 