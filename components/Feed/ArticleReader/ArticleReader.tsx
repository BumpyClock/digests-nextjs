"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FeedItem, ReaderViewResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanupModalContent } from "@/utils/htmlUtils";
import { useFeedStore } from "@/store/useFeedStore";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { Ambilight } from "@/components/ui/ambilight";

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
}) => {
  // Validate the URL before rendering
  const isValidUrl = (url: string) => {
    if (!url || url.trim() === '') return false;
    try {
      new URL(url);
      return true;
    } catch {
      // If it's not a full URL, check if it's a valid relative path
      return url.startsWith('/') || url.startsWith('http');
    }
  };

  // Don't render anything if there's no valid image
  if (!isValidUrl(src)) {
    return null;
  }

  return (
    <Image
      src={src}
      width={550}
      height={550}
      alt={alt}
      className={className}
      style={style}
    />
  );
});
ArticleImage.displayName = 'ArticleImage';

export const SiteFavicon = memo(({ 
  favicon, 
  siteTitle, 
  size = "small" 
}: { 
  favicon: string; 
  siteTitle: string;
  size?: "small" | "medium" 
}) => {
  // Validate the URL before rendering
  const isValidUrl = (url: string) => {
    if (!url || url.trim() === '') return false;
    try {
      new URL(url);
      return true;
    } catch {
      // If it's not a full URL, check if it's a valid relative path
      return url.startsWith('/') || url.startsWith('http');
    }
  };

  const faviconSrc = isValidUrl(favicon) ? favicon : "/placeholder-rss.svg";

  return (
    <Image
      src={faviconSrc}
      alt={siteTitle}
      className={`rounded ${size === "small" ? "max-h-5 max-w-5" : "max-h-6 max-w-6"}`}
      width={size === "small" ? 20 : 24}
      height={size === "small" ? 20 : 24}
    />
  );
});
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
  const { addToReadLater, removeFromReadLater, isInReadLater } = useFeedStore();
  const [isInReadLaterList, setIsInReadLaterList] = useState(false);

  useEffect(() => {
    setIsInReadLaterList(isInReadLater(feedItem.id));
  }, [feedItem.id, isInReadLater]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: feedItem.title,
          text: feedItem.description,
          url: feedItem.link,
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        toast("Share link copied", {
          description: "The link to this article has been copied to your clipboard.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Error sharing", {
          description: "Failed to share the article. Please try again.",
        });
      }
    }
  };

  const handleReadLater = () => {
    if (isInReadLaterList) {
      removeFromReadLater(feedItem.id);
      setIsInReadLaterList(false);
      toast("Removed from Read Later", {
        description: "The article has been removed from your reading list.",
      });
    } else {
      addToReadLater(feedItem.id);
      setIsInReadLaterList(true);
      toast("Added to Read Later", {
        description: "The article has been added to your reading list.",
      });
    }
  };

  return (
    <>
      {showThumbnail && feedItem.thumbnail && feedItem.thumbnail.trim() !== '' && (
        <Ambilight
          className={`overflow-hidden ${isModal ? 'rounded-[24px] mb-6' : 'rounded-lg mb-6 mt-4'}`}
          isActive={true}
          opacity={{ rest: 0.5, hover: 0.7 }}
        >
          <ArticleImage
            src={feedItem.thumbnail}
            alt={feedItem.title}
            className={`w-full ${isModal ? 'thumbnail-image !h-[500px]' : 'max-h-[450px]'} object-cover ${isModal ? 'drop-shadow-lg transition-transform duration-0' : ''}`}
            style={parallaxOffset !== undefined ? {
              transform: `translateY(${parallaxOffset}px)`,
              marginTop: isModal ? '-80px' : undefined,
            } : undefined}
          />
        </Ambilight>
      )}
      
      {/* Reader View Header */}
      <div className={`${className || 'w-full md:max-w-4xl m-auto'}`}>
        {/* Mobile compact view header */}
        {isCompact ? (
          <div className="mb-4">
            {readerView?.title && (
              <h1 className="text-xl font-bold mb-2 text-left">
                {readerView.title}
              </h1>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground max-w-[200px]">
                {feedItem.favicon && (
                  <SiteFavicon 
                    favicon={feedItem.favicon} 
                    siteTitle={feedItem.siteTitle} 
                    size="small" 
                  />
                )}
                <span 
                  className="truncate block"
                  title={feedItem.siteTitle}
                >
                  {feedItem.siteTitle}
                </span>
              </div>
              <div className="flex">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleReadLater}
                  className="h-8 w-8"
                >
                  <Bookmark className={`h-4 w-4 ${isInReadLaterList ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleShare}
                  className="h-8 w-8"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  asChild
                  className="h-8 w-8"
                >
                  <a href={feedItem.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <ReadingTime content={readerView?.content} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground max-w-[400px]">
                {feedItem.favicon && (
                  <SiteFavicon 
                    favicon={feedItem.favicon} 
                    siteTitle={feedItem.siteTitle} 
                    size={isModal ? "medium" : "small"} 
                  />
                )}
                <span 
                  className="truncate block"
                  title={feedItem.siteTitle}
                >
                  {feedItem.siteTitle}
                </span>
              </div>
              
              {/* Actions */}
              {actions || (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleReadLater}
                  >
                    <Bookmark className={`h-4 w-4 mr-1 ${isInReadLaterList ? "fill-red-500 text-red-500" : ""}`} />
                    {isInReadLaterList ? "Read Later" : "Read Later"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
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
          </>
        )}
      </div>
    </>
  );
});
ArticleHeader.displayName = 'ArticleHeader';

// Article content component
export const ArticleContent = memo(({ content, className }: { content: string, className?: string }) => {
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
      className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-foreground px-6 md:px-8 lg:px-12 ${className || 'w-full md:max-w-4xl'}`}
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
export const EmptyState = memo(() => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 ${isMobile ? 'p-4' : 'p-8'}`}>
      <div className={`text-center ${isMobile ? 'w-full' : 'max-w-md'}`}>
        <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'} mb-2`}>Select an article</h3>
        <p className="text-muted-foreground text-sm">
          Choose an article from the list to view its content here.
        </p>
      </div>
    </div>
  );
});
EmptyState.displayName = 'EmptyState';

export function processArticleContent(readerView: ReaderViewResponse | null): string {
  if (!readerView || !readerView.content) return '';
  
  return cleanupModalContent(readerView.content);
} 