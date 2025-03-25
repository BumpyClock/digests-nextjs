"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { type FeedItem, type ReaderViewResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BaseModal } from "./base-modal";
import Image from "next/image";
import { workerService } from "@/services/worker-service";
import { Scrollbars } from "react-custom-scrollbars-2";
import { cleanupModalContent } from "@/utils/htmlUtils";

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  initialPosition: { x: number; y: number; width: number; height: number };
}

// Memoized Image component for better performance
const ArticleImage = memo(({ src, alt, className, style }: { src: string; alt: string; className: string; style?: React.CSSProperties }) => (
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
const SiteFavicon = memo(({ favicon, siteTitle }: { favicon: string; siteTitle: string }) => (
  <Image
    src={favicon || "/placeholder.svg"}
    alt={siteTitle}
    className="rounded max-h-6 max-w-6"
    width={24}
    height={24}
  />
));
SiteFavicon.displayName = 'SiteFavicon';

// Memoized article header component
const ArticleHeader = memo(({ feedItem, readerView, parallaxOffset }: { 
  feedItem: FeedItem; 
  readerView: ReaderViewResponse | null;
  parallaxOffset: number;
}) => (
  <>
    {feedItem.thumbnail && (
      <div className="overflow-hidden rounded-[24px] mb-6">
        <ArticleImage
          src={feedItem.thumbnail}
          alt={feedItem.title}
          className="w-full h-auto max-h-[500px] object-cover drop-shadow-lg transition-transform duration-0"
          style={{
            transform: `translateY(${parallaxOffset}px)`,
            marginTop: '-80px',
          }}
        />
      </div>
    )}
    <div className="flex flex-col items-left text-sm mb-6 gap-1 px-8">
      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-1 flex-grow">
        {readerView?.favicon && (
          <SiteFavicon favicon={feedItem.favicon} siteTitle={feedItem.siteTitle} />
        )}
        <span>{feedItem.siteTitle}</span>
      </div>
      {readerView?.title && (
        <h1 id="reader-view-title" className="text-4xl font-bold mb-2">{readerView.title}</h1>
      )}
      <ReadingTime content={readerView?.content} />
    </div>
  </>
));
ArticleHeader.displayName = 'ArticleHeader';

// Memoized reading time component
const ReadingTime = memo(({ content }: { content?: string }) => {
  const readingTimeText = useMemo(() => {
    if (!content) return 'Reading time N/A';
    const text = content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.round(wordCount / 225);
    return readingTimeMinutes < 1 ? 'Less than a minute read' : `${readingTimeMinutes} minute read`;
  }, [content]);

  return (
    <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-grow mb-1">
      <span>{readingTimeText}</span>
    </div>
  );
});
ReadingTime.displayName = 'ReadingTime';

// Memoized article content component
const ArticleContent = memo(({ content }: { content: string }) => {
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
      className="px-8 prose prose-amber w-full text-lg prose-lg md:max-w-5xl dark:prose-invert reader-view-article mb-24"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
ArticleContent.displayName = 'ArticleContent';

// Memoized loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    <Skeleton className="h-[400px] max-h-[50vh] w-full rounded-[32px]" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  initialPosition,
}: ReaderViewModalProps) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [isBottomVisible, setIsBottomVisible] = useState(false);
  const { toast } = useToast();

  console.log(readerView);
  const cleanedContent = useMemo(() => {
    if (!readerView?.content) return '';
    return cleanupModalContent(readerView.content);
  }, [readerView?.content]);

  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: { 
    scrollTop: number, 
    scrollHeight: number, 
    clientHeight: number 
  }) => {
    setScrollTop(scrollTop);
    const bottomThreshold = 20;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    setIsBottomVisible(!isAtBottom);
  }, []);

  useEffect(() => {
    async function loadReaderView() {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const result = await workerService.fetchReaderView(feedItem.link);
        
        if (result.success && result.data.length > 0 && result.data[0].status === "ok") {
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
      }
      setLoading(false);
    }

    loadReaderView();
  }, [isOpen, feedItem.link, toast]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      link={feedItem.link}
      title={readerView?.title || "Loading..."}
      initialPosition={initialPosition}
      className=""
    >
      <div className="relative">
        <div 
          id="reader-view-modal-top-shadow"
          className={`absolute top-[-10px] left-0 inset-shadow-black-500 right-0 bg-background/35 z-10 pointer-events-none transition-all ease-in-out dark:bg-background/85 duration-300 ${
            scrollTop > 0 ? 'opacity-100 h-24' : 'opacity-0 h-0'
          } [@supports_not_(backdrop-filter:blur(0))]:bg-background/90`}
          style={{
            filter: 'brightness(0.75)',
            backdropFilter: 'blur(40px)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)'
          }}
        />
        
        <Scrollbars 
          id="reader-view-modal-scroll"
          style={{ width: '100%', height: 'calc(100vh - 10px)' }}
          autoHide
          onScrollFrame={handleScroll}
        > 
          <div className="px-4 py-4 mx-auto">
            <div>
              {loading ? (
                <LoadingSkeleton />
              ) : readerView ? (
                <article>
                  <ArticleHeader 
                    feedItem={feedItem} 
                    readerView={readerView} 
                    parallaxOffset={parallaxOffset}
                  />
                  <ArticleContent content={cleanedContent} />
                </article>
              ) : (
                <div className="text-center">
                  <p>Failed to load reader view. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </Scrollbars>

        <div 
          id="reader-view-modal-bottom-shadow"
          className={`absolute inset-shadow-black-500 bottom-0 left-0 right-0 bg-background/35 z-10 pointer-events-none transition-all ease-in-out duration-300 ${
            isBottomVisible ? 'opacity-100 h-24' : 'opacity-0 h-0'
          } [@supports_not_(backdrop-filter:blur(0))]:bg-background/90`}
          style={{
            filter: 'brightness(0.75)',
            backdropFilter: 'blur(40px)',
            maskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)'
          }}
        />
      </div>
    </BaseModal>
  );
}