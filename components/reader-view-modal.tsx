"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

// Create a component to handle the article content
const ArticleContent = ({ content }: { content: string }) => {
  useEffect(() => {
    // Get all next-image elements
    const nextImages = document.querySelectorAll('next-image');
    
    // Replace each next-image with an actual Next.js Image component
    nextImages.forEach((element) => {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      const isSmall = element.hasAttribute('small');
      const className = element.getAttribute('class') || '';
      
      // Create the Image component
      const img = document.createElement('img');
      const imgWrapper = document.createElement('div');
      
      // Set wrapper class based on image type
      imgWrapper.className = isSmall 
        ? 'relative inline-block' // For small images like avatars
        : 'relative aspect-video'; // For content images
      
      // Set up the image
      img.src = src;
      img.alt = alt;
      img.className = `${className} ${isSmall ? 'object-cover' : 'object-contain'}`;
      img.style.width = '100%';
      img.style.height = 'auto';
      
      // Replace the next-image element with our wrapped image
      imgWrapper.appendChild(img);
      element.parentNode?.replaceChild(imgWrapper, element);
    });
  }, [content]);

  return (
    <div
      className="px-8 prose prose-amber w-full text-lg prose-lg md:max-w-5xl dark:prose-invert reader-view-article mb-24"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

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

  const cleanedContent = useMemo(() => {
    if (!readerView?.content) return '';
    return cleanupModalContent(readerView.content);
  }, [readerView?.content]);

  const memoizedOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const memoizedPosition = useMemo(() => initialPosition, [initialPosition]);

  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: { scrollTop: number, scrollHeight: number, clientHeight: number }) => {
    setScrollTop(scrollTop);
    
    const bottomThreshold = 20; 
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    setIsBottomVisible(!isAtBottom);
  }, []);

  useEffect(() => {
    async function loadReaderView() {
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

    if (isOpen) {
      loadReaderView();
    }
  }, [isOpen, feedItem, toast]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={memoizedOnClose}
      link={feedItem.link}
      title={readerView?.title || "Loading..."}
      initialPosition={memoizedPosition}
      className=""
    >
      <div className="relative">
        {/* Top shadow */}
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
        
          <div className="px-4 py-4  mx-auto">
            <div >
              {loading ? (
                <div className="space-y-4">
                   <Skeleton className="h-[400px] max-h-[50vh] w-full rounded-[32px]" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : readerView ? (
                
                <article className="">
                  {feedItem.thumbnail && (
                    <div className="overflow-hidden rounded-[24px] mb-6">
                      <Image
                        src={feedItem.thumbnail || "/placeholder.svg"}
                        width={550}
                        height={550}
                        alt={feedItem.title}
                        className="w-full h-auto max-h-[500px] object-cover drop-shadow-lg transition-transform duration-0"
                        style={{
                          transform: `translateY(${parallaxOffset}px)`,
                          marginTop: '-80px',
                        }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col items-left text-sm  mb-6 gap-1 px-8">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-1 flex-grow ">
                  {readerView.favicon && (
                      <Image
                        src={feedItem.favicon || "/placeholder.svg"}
                        alt={feedItem.siteTitle}
                        className="rounded max-h-6 max-w-6"
                        width={24}
                        height={24}
                      />
                    )}
                    <span>{feedItem.siteTitle}</span>
                  </div>
                  {feedItem.title && (
                    <h1 id="reader-view-title" className="text-4xl font-bold mb-2 ">{feedItem.title}</h1>
                  )}
                

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground flex-grow mb-1">
                   
                    <span>
                      {readerView.content ? (() => {
                        const text = readerView.content.replace(/<[^>]*>/g, ''); 
                        const wordCount = text.split(/\s+/).filter(Boolean).length; 
                        const readingTimeMinutes = Math.round(wordCount / 225); 

                        if (readingTimeMinutes < 1) {
                          return 'Less than a minute read';
                        } else {
                          return `${readingTimeMinutes} minute read`;
                        }
                      })() : 'Reading time N/A'}
                    </span>
                  </div>
                  </div>
                  
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

        {/* Bottom shadow */}
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