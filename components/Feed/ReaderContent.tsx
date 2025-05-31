"use client";

import { memo } from "react";
import { FeedItem, ReaderViewResponse } from "@/types";
import { ReaderLayout } from "@/types/reader";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  ArticleHeader,
  ArticleContent,
  LoadingSkeleton,
} from "@/components/Feed/ArticleReader/ArticleReader";
import { motion } from "motion/react";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { contentVariants } from "@/utils/animation-config";

interface ReaderContentProps {
  feedItem: FeedItem;
  readerView: ReaderViewResponse | null;
  loading: boolean;
  cleanedContent: string;
  layout?: ReaderLayout;
  parallaxOffset?: number;
  className?: string;
  initialThumbnailSrc?: string;
}

export const ReaderContent = memo(function ReaderContent({
  feedItem,
  readerView,
  loading,
  cleanedContent,
  layout = "standard",
  parallaxOffset,
  className = "",
  initialThumbnailSrc,
}: ReaderContentProps) {
  const isMobile = useIsMobile();
  const isCompact = layout === "compact" || (isMobile && layout === "standard");
  const { animationEnabled } = useFeedAnimation();

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

  // Use increased padding for modal layout
  const containerPadding =
    layout === "modal"
      ? "px-2 py-2 md:px-6 md:py-2 lg:px-2"
      : isCompact
      ? "px-3 py-4"
      : "p-2";

  const ContentWrapper =
    animationEnabled && layout === "modal" ? motion.div : "div";

  return (
    <div className={`${containerPadding} ${className}`}>
      <article>
        <ArticleHeader
          feedItem={feedItem}
          readerView={readerView}
          parallaxOffset={parallaxOffset}
          layout={layout}
          initialThumbnailSrc={initialThumbnailSrc}
        />
        <ContentWrapper
          {...(animationEnabled && layout === "modal"
            ? {
                variants: contentVariants,
                initial: "hidden",
                animate: "visible",
              }
            : {})}
        >
          <ArticleContent
            content={cleanedContent}
            className={`w-full ${isMobile ? "max-w-full" : "md:max-w-4xl"} ${
              layout === "modal" ? "no-animation" : ""
            }`}
          />
        </ContentWrapper>
      </article>
    </div>
  );
});
