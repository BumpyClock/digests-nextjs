"use client";

import { memo, useEffect, useMemo } from "react";
import Image from "next/image";
import { FeedItem, ReaderViewResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanupModalContent } from "@/utils/htmlUtils";

// Memoized Image component for better performance
export const ArticleImage = memo(({ 
  src, 
  alt, 
  className, 
  style 
}: { 
  src: string; 
  alt: string; 
  className: string; 
  style?: React.CSSProperties 
}) => (
  <Image
    src={src || "/placeholder.svg"}
    width={550}
    height={550}
    alt={alt}
    className={className}
    style={style}
  />
));
ArticleImage.displayName = 'ArticleImage';

// Memoized favicon component
export const SiteFavicon = memo(({ 
  favicon, 
  siteTitle, 
  size = "small" 
}: { 
  favicon: string; 
  siteTitle: string;
  size?: "small" | "medium" 
}) => (
  <Image
    src={favicon || "/placeholder.svg"}
    alt={siteTitle}
    className={`rounded ${size === "small" ? "max-h-5 max-w-5" : "max-h-6 max-w-6"}`}
    width={size === "small" ? 20 : 24}
    height={size === "small" ? 20 : 24}
  />
));
SiteFavicon.displayName = 'SiteFavicon';

// Memoized reading time component
export const ReadingTime = memo(({ content }: { content?: string }) => {
  const readingTimeText = useMemo(() => {
    if (!content) return 'Reading time N/A';
    const text = content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.round(wordCount / 225);
    return readingTimeMinutes < 1 ? 'Less than a minute read' : `${readingTimeMinutes} minute read`;
  }, [content]);

  return (
    <div className="text-sm text-muted-foreground mb-1">
      <span>{readingTimeText}</span>
    </div>
  );
});
ReadingTime.displayName = 'ReadingTime';

// Article header component with various layouts
export const ArticleHeader = memo(({ 
  feedItem, 
  readerView, 
  parallaxOffset,
  showThumbnail = true,
  layout = "standard",
  actions,
  className
}: { 
  feedItem: FeedItem; 
  readerView: ReaderViewResponse | null;
  parallaxOffset?: number;
  showThumbnail?: boolean;
  layout?: "standard" | "compact" | "modal";
  actions?: React.ReactNode;
  className?: string;
}) => {
  const isModal = layout === "modal";
  const isCompact = layout === "compact";

  return (
    <>
      {showThumbnail && feedItem.thumbnail && (
        <div className={`overflow-hidden ${isModal ? 'rounded-[24px] mb-6' : 'rounded-lg mb-6 mt-4'}`}>
          <ArticleImage
            src={feedItem.thumbnail}
            alt={feedItem.title}
            className={`w-full ${isModal ? 'thumbnail-image !h-[500px]' : 'max-h-[300px]'} object-cover ${isModal ? 'drop-shadow-lg transition-transform duration-0' : ''}`}
            style={parallaxOffset !== undefined ? {
              transform: `translateY(${parallaxOffset}px)`,
              marginTop: isModal ? '-80px' : undefined,
            } : undefined}
          />
        </div>
      )}
      
      {/* Reader View Header */}
      <div className={`flex ${isCompact ? 'flex-col' : 'flex-col'} items-left text-sm mb-6 gap-1 m-auto ${className || 'w-full md:max-w-4xl'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {feedItem.favicon && (
              <SiteFavicon 
                favicon={feedItem.favicon} 
                siteTitle={feedItem.siteTitle} 
                size={isModal ? "medium" : "small"} 
              />
            )}
            <span>{feedItem.siteTitle}</span>
          </div>
          
          {actions || (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">
                <Heart className="h-4 w-4 mr-1" />
                Favorite
              </Button>
              <Button size="sm" variant="ghost">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={feedItem.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            </div>
          )}
        </div>
        
        {readerView?.title && (
          <h1 
            className={isModal ? "text-4xl font-bold mb-2 text-left" : "text-2xl sm:text-3xl font-bold mb-3 text-left"}
            id={isModal ? "reader-view-title" : undefined}
          >
            {readerView.title}
          </h1>
        )}
        
        <ReadingTime content={readerView?.content} />
      </div>
    </>
  );
});
ArticleHeader.displayName = 'ArticleHeader';

// Article content component
export const ArticleContent = memo(({ content, className, isModal }: { content: string, className?: string, isModal?: boolean }) => {
  useEffect(() => {
    const replaceNextImages = () => {
      const nextImages = document.querySelectorAll('next-image');
      nextImages.forEach((element) => {
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        const isSmall = element.hasAttribute('small');
        const className = element.getAttribute('class') || '';
        
        const img = document.createElement('img');
        const imgWrapper = document.createElement('div');
        
        imgWrapper.className = isSmall 
          ? 'relative inline-block'
          : 'relative aspect-video';
        
        img.src = src;
        img.alt = alt;
        img.className = `${className} ${isSmall ? 'object-cover' : 'object-contain'}`;
        img.style.width = '100%';
        img.style.height = 'auto';
        
        imgWrapper.appendChild(img);
        element.parentNode?.replaceChild(imgWrapper, element);
      });
    };

    replaceNextImages();
  }, [content]);

  return (
    <div
      className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto ${className || 'w-full md:max-w-4xl'}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
ArticleContent.displayName = 'ArticleContent';

// Loading skeleton component
export const LoadingSkeleton = memo(({ compact }: { compact?: boolean }) => (
  <div className="space-y-4 p-6">
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
LoadingSkeleton.displayName = 'LoadingSkeleton';

// Empty state component
export const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="mb-4 text-muted-foreground">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 20H5V4H14V8H19V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 4L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold mb-2">Select an article</h3>
    <p className="text-muted-foreground">Choose an article from the list to read it here</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

export function processArticleContent(readerView: ReaderViewResponse | null): string {
  if (!readerView?.content) return '';
  return cleanupModalContent(readerView.content);
} 