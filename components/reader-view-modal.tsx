"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { type FeedItem, type ReaderViewResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BaseModal } from "./base-modal";
import Image from "next/image";
import { workerService } from "@/services/worker-service";
import { Scrollbars } from "react-custom-scrollbars-2";


interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  initialPosition: { x: number; y: number; width: number; height: number };
}

/**
 * Cleans up modal content by removing duplicate images, excluding the thumbnail,
 * and selecting the highest quality variant when the same image is available with different crop queries.
 * 
 * The quality metric is determined by:
 *   1. The "w" query parameter (parsed as an integer).
 *   2. If "w" values are equal, the third value of the "crop" parameter (parsed as a float).
 * 
 * @param htmlContent The HTML content to clean.
 * @param thumbnailUrl The URL of the thumbnail image to exclude from content.
 * @returns Cleaned HTML content without duplicates or the thumbnail.
 */
const cleanupModalContent = (htmlContent: string, thumbnailUrl?: string): string => {
  if (!htmlContent) return htmlContent;
  
  // Parse the HTML string into a document.
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Get all images as an array.
  const images = Array.from(doc.querySelectorAll('img'));
  
  // Create a set of thumbnail URL variations for removal.
  const seenImageUrls = new Set<string>();
  if (thumbnailUrl) {
    seenImageUrls.add(thumbnailUrl);
    if (thumbnailUrl.startsWith('https://')) {
      seenImageUrls.add(thumbnailUrl.replace('https://', 'http://'));
    } else if (thumbnailUrl.startsWith('http://')) {
      seenImageUrls.add(thumbnailUrl.replace('http://', 'https://'));
    }
    seenImageUrls.add(thumbnailUrl.replace(/^https?:\/\//, '//'));
    seenImageUrls.add(thumbnailUrl.replace(/^https?:\/\//, ''));
    const withoutTrailingSlash = thumbnailUrl.replace(/\/$/, '');
    const withTrailingSlash = thumbnailUrl.endsWith('/') ? thumbnailUrl : `${thumbnailUrl}/`;
    seenImageUrls.add(withoutTrailingSlash);
    seenImageUrls.add(withTrailingSlash);
    const baseUrl = thumbnailUrl.split('?')[0];
    seenImageUrls.add(baseUrl);
  }
  
  // Map to track the best (highest quality) image per base URL.
  const imageMap = new Map<string, { element: HTMLImageElement, quality: { w: number, cropWidth: number } }>();

  // Helper: compute quality metric from URL query parameters.
  const getQualityMetric = (url: string): { w: number, cropWidth: number } => {
    let w = 0;
    let cropWidth = 0;
    try {
      const urlObj = new URL(url, document.baseURI);
      const wParam = urlObj.searchParams.get('w');
      if (wParam) {
        w = parseInt(wParam, 10) || 0;
      }
      const cropParam = urlObj.searchParams.get('crop');
      if (cropParam) {
        // Split by commas or whitespace.
        const parts = cropParam.split(/[\s,]+/);
        if (parts.length >= 3) {
          cropWidth = parseFloat(parts[2]) || 0;
        }
      }
    } catch (err) {
      console.error("Error parsing URL:", err)
      // If the URL cannot be parsed, quality defaults remain.
    }
    return { w, cropWidth };
  };

  // Helper: compare two quality metrics. Returns true if q1 is higher than q2.
  const isHigherQuality = (q1: { w: number, cropWidth: number }, q2: { w: number, cropWidth: number }) => {
    if (q1.w !== q2.w) {
      return q1.w > q2.w;
    }
    return q1.cropWidth > q2.cropWidth;
  };

  // Iterate over all images.
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (!src) {
      // Remove images with no source.
      img.parentElement?.removeChild(img);
      return;
    }
    
    // Check against thumbnail variations.
    if (thumbnailUrl) {
      const normalizedSrc = src.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const normalizedThumbnail = thumbnailUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (normalizedSrc.includes(normalizedThumbnail) || normalizedThumbnail.includes(normalizedSrc)) {
        img.parentElement?.removeChild(img);
        return;
      }
    }
    
    // Determine the base URL (everything before the '?').
    const baseUrl = src.split('?')[0];
    const currentQuality = getQualityMetric(src);
    
    if (imageMap.has(baseUrl)) {
      // Compare with the image already stored for this base URL.
      const existing = imageMap.get(baseUrl)!;
      if (isHigherQuality(currentQuality, existing.quality)) {
        // Current image is better quality; remove the previous one.
        existing.element.parentElement?.removeChild(existing.element);
        imageMap.set(baseUrl, { element: img, quality: currentQuality });
      } else {
        // Existing image is higher quality; remove the current one.
        img.parentElement?.removeChild(img);
      }
    } else {
      // No image for this base URL yet; add this one.
      imageMap.set(baseUrl, { element: img, quality: currentQuality });
    }
    
    // Optionally, add the src to the seen set (if you need additional duplicate checks).
    seenImageUrls.add(src);
  });
  
  // Return the cleaned HTML.
  return doc.body.innerHTML;
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
 

  // Use useMemo to create a stable onClose callback to prevent prop changes
  const memoizedOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize initialPosition object to maintain reference equality
  const memoizedPosition = useMemo(() => initialPosition, [initialPosition]);

  // Add parallax calculation
  const parallaxOffset = useMemo(() => {
    // Limit the parallax effect to a reasonable range (e.g., 0-50px)
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  // Update scroll handler to check both top and bottom shadows
  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: { scrollTop: number, scrollHeight: number, clientHeight: number }) => {
    setScrollTop(scrollTop);
    
    // Check if we're at the bottom
    const bottomThreshold = 20; // pixels from bottom to trigger shadow
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    setIsBottomVisible(!isAtBottom);
  }, []);

  useEffect(() => {
    async function loadReaderView() {
      setLoading(true);
      try {
        // Use worker service instead of direct API call
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
      className="xs:max-w-full xs:rounded-none xs:border-none xs:h-full xs:max-h-full xs:max-w-full"
    >
      <div className="relative">
        {/* Top shadow */}
        <div 
          id="reader-view-modal-top-shadow"
          className={`absolute top-[-10px] left-0 inset-shadow-black-500 right-0 backdrop-blur-[40px] bg-background/35 z-10 pointer-events-none transition-all ease-in-out dark:bg-background/85 duration-300 ${
            scrollTop > 0 ? 'opacity-100 h-24' : 'opacity-0 h-0'
          }`}
          style={{
            filter: 'brightness(0.75)',
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
                   <Skeleton className="h-[400px] max-h-[50vh] w-full" />
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
                        alt={feedItem.title}
                        className="w-full h-auto max-h-[500px] object-cover drop-shadow-lg transition-transform duration-0"
                        width={550}
                        height={385}
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
                        className=" rounded max-h-6 max-w-6"
                        height={100}
                        width={100}
                      />
                    )}
                    <span>{feedItem.siteTitle}</span>
                  </div>
                  {feedItem.title && (
                    <h1 id="reader-view-title" className="text-4xl font-bold mb-2 ">{feedItem.title}</h1>
                  )}
                

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-1 flex-grow ">
                   
                    <span>
                      {readerView.content ? (() => {
                        const text = readerView.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
                        const wordCount = text.split(/\s+/).filter(Boolean).length; // Split by spaces and count words
                        const readingTimeMinutes = Math.round(wordCount / 225); // Avg reading speed: 225 words per minute

                        if (readingTimeMinutes < 1) {
                          return 'Less than a minute read';
                        } else {
                          return `${readingTimeMinutes} minute read`;
                        }
                      })() : 'Reading time N/A'}
                    </span>
                  </div>
                  </div>
                  
                  <div
                      className=" px-8 prose prose-amber w-full text-lg prose-lg md:max-w-5xl dark:prose-invert reader-view-article"
                    dangerouslySetInnerHTML={{ __html: cleanupModalContent(readerView.content) }}
                  />
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
          className={`absolute inset-shadow-black-500 bottom-0 left-0 right-0 backdrop-blur-[40px] light:bg-foreground/05 dark:bg-background/45 z-10 pointer-events-none transition-all ease-in-out duration-300 ${
            isBottomVisible ? 'opacity-100 h-24' : 'opacity-0 h-0'
          }`}
          style={{
            filter: 'brightness(0.75)',

            maskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)'
          }}
        />
      </div>
    </BaseModal>
  );
}