"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { type ReaderViewResponse } from "@/types";
import { fetchReaderView } from "@/lib/rss";
import { useToast } from "@/hooks/use-toast";
import { BaseModal } from "./base-modal";
import Image from "next/image";

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleUrl: string;
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
  isOpen,
  onClose,
  articleUrl,
  initialPosition,
}: ReaderViewModalProps) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
 

  // Use useMemo to create a stable onClose callback to prevent prop changes
  const memoizedOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize initialPosition object to maintain reference equality
  const memoizedPosition = useMemo(() => initialPosition, [
    initialPosition]);

  useEffect(() => {
    async function loadReaderView() {
      setLoading(true);
      try {
        const readerViewData = await fetchReaderView([articleUrl]);
        if (readerViewData.length > 0 && readerViewData[0].status === "ok") {
          setReaderView(readerViewData[0]);
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
  }, [isOpen, articleUrl, toast]);
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={memoizedOnClose}
      link={articleUrl}
      title={readerView?.title || "Loading..."}
      initialPosition={memoizedPosition}
        className="xs:max-w-full xs:rounded-none xs:border-none xs:h-full xs:max-h-full xs:max-w-full [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-track]:bg-gray-100
  [&::-webkit-scrollbar-thumb]:bg-gray-300
  dark:[&::-webkit-scrollbar-track]:bg-neutral-700
  dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 "
    >       

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : readerView ? (
        <article>
          {readerView.image && (
            <Image
              src={readerView.image || "/placeholder.svg"}
              alt={readerView.title}
              className="w-full h-auto mb-6 rounded-[24px]"
              width={500}
              height={500}
              
            />
          )}
          <div className="flex flex-col items-center space-x-4 text-sm  mb-6">
          {readerView.title && (
            <h1 id="reader-view-title" className="text-4xl font-bold mb-6">{readerView.title}</h1>
          )}

          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-6 ">
            {readerView.favicon && (
              <Image
                src={readerView.favicon || "/placeholder.svg"}
                alt={readerView.siteName}
                className=" rounded max-h-6 max-w-6"
                height={100}
                width={100}
              />
            )}
            <span>{readerView.siteName}</span>
            <span>•</span>
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
              className=" prose prose-amber w-full text-lg prose-lg md:max-w-5xl dark:prose-invert reader-view-article"
            dangerouslySetInnerHTML={{ __html: cleanupModalContent(readerView.content) }}
          />
        </article>
      ) : (
        <div className="text-center">
          <p>Failed to load reader view. Please try again.</p>
        </div>
      )}
    </BaseModal>
  );
}
