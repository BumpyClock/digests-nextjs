"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import "./ArticleReader.css";
import Image from "next/image";
import { FeedItem, ReaderViewResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanupModalContent } from "@/utils/htmlUtils";
import { cleanupMarkdownContent } from "@/utils/imageDeduplicator";
import { useFeedStore } from "@/store/useFeedStore";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { Ambilight } from "@/components/ui/ambilight";
import { getImageProps } from "@/utils/image-config";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { canUseImageKit } from "@/utils/imagekit";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export const ArticleImage = memo(
  ({
    src,
    alt,
    className,
    style,
    priority = false,
    progressive = false,
    initialSrc,
  }: {
    src: string;
    alt: string;
    className: string;
    style?: React.CSSProperties;
    priority?: boolean;
    progressive?: boolean;
    initialSrc?: string;
  }) => {
    // Validate the URL before rendering
    const isValidUrl = (url: string) => {
      if (!url || url.trim() === "") return false;
      try {
        new URL(url);
        return true;
      } catch {
        // If it's not a full URL, check if it's a valid relative path
        return url.startsWith("/") || url.startsWith("http");
      }
    };

    // Don't render anything if there's no valid image
    if (!isValidUrl(src)) {
      return null;
    }

    // Use progressive loading for modals when ImageKit is available
    if (progressive && canUseImageKit(src)) {
      return (
        <div className="relative">
          <ProgressiveImage
            src={src}
            alt={alt}
            className={className}
            style={style}
            width={800}
            height={600}
            initialSrc={initialSrc}
          />
        </div>
      );
    }

    // Standard image loading for non-modal views
    return (
      <Image
        src={src}
        alt={alt}
        width={550}
        height={413} // 4:3 aspect ratio as default
        className={className}
        style={{
          ...style,
          width: "100%",
          height: "auto",
          maxWidth: "100%",
        }}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 550px"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />
    );
  }
);
ArticleImage.displayName = "ArticleImage";

export const SiteFavicon = memo(
  ({
    favicon,
    siteTitle,
    size = "small",
    priority = false,
  }: {
    favicon: string;
    siteTitle: string;
    size?: "small" | "medium";
    priority?: boolean;
  }) => {
    // Validate the URL before rendering
    const isValidUrl = (url: string) => {
      if (!url || url.trim() === "") return false;
      try {
        new URL(url);
        return true;
      } catch {
        // If it's not a full URL, check if it's a valid relative path
        return url.startsWith("/") || url.startsWith("http");
      }
    };

    const faviconSrc = isValidUrl(favicon) ? favicon : "/placeholder-rss.svg";

    return (
      <Image
        src={faviconSrc}
        alt={siteTitle}
        className={`rounded ${
          size === "small" ? "max-h-5 max-w-5" : "max-h-6 max-w-6"
        }`}
        {...getImageProps("icon", priority ? "eager" : "lazy")}
      />
    );
  }
);
SiteFavicon.displayName = "SiteFavicon";

// Memoized reading time component
export const ReadingTime = memo(({ content, markdown }: { content?: string; markdown?: string }) => {
  const readingTimeText = useMemo(() => {
    // Prefer markdown for word count calculation
    const textToAnalyze = markdown || content;
    if (!textToAnalyze) return "Reading time N/A";
    
    // Remove HTML tags and markdown formatting for accurate word count
    const cleanText = textToAnalyze
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[#*_`~\[\]()]/g, "") // Remove common markdown characters
      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove markdown images
      .replace(/\[.*?\]\(.*?\)/g, "") // Remove markdown links
      .trim();
    
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.round(wordCount / 225);
    return readingTimeMinutes < 1
      ? "Less than a minute read"
      : `${readingTimeMinutes} minute read`;
  }, [content, markdown]);

  return (
    <div className="text-fluid-xs text-muted-foreground mb-1">
      <span>{readingTimeText}</span>
    </div>
  );
});
ReadingTime.displayName = "ReadingTime";

// Article header component with various layouts
export const ArticleHeader = memo(
  ({
    feedItem,
    readerView,
    parallaxOffset,
    showThumbnail = true,
    layout = "standard",
    actions,
    className,
    loading = false,
    extractedAuthor,
  }: {
    feedItem: FeedItem;
    readerView: ReaderViewResponse | null;
    parallaxOffset?: number;
    showThumbnail?: boolean;
    layout?: "standard" | "compact" | "modal";
    actions?: React.ReactNode;
    className?: string;
    loading?: boolean;
    extractedAuthor?: { name: string; image?: string };
  }) => {
    const isModal = layout === "modal";
    const isCompact = layout === "compact";
    const { addToReadLater, removeFromReadLater, isInReadLater } =
      useFeedStore();
    const [isInReadLaterList, setIsInReadLaterList] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

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
            description:
              "The link to this article has been copied to your clipboard.",
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
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
        {/* Thumbnail Section */}
        {showThumbnail && (
          <div className="mb-6">
            <div className={`overflow-hidden relative ${
              isModal
                ? "rounded-[24px] max-h-[450px]"
                : "rounded-lg mt-4"
            }`}>
              {loading ? (
                // Show skeleton when loading
                <Skeleton className={`w-full ${
                  isModal ? "h-[450px]" : "h-[200px] md:h-[250px]"
                }`} />
              ) : feedItem.thumbnail && feedItem.thumbnail.trim() !== "" ? (
                <>
                  {/* Skeleton placeholder - positioned behind image */}
                  <AnimatePresence>
                    {!imageLoaded && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 z-10"
                      >
                        <Skeleton className="w-full h-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actual image with Ambilight - always in position */}
                  <Ambilight
                    className="w-full h-full"
                    isActive={true}
                    opacity={{ rest: 0.5, hover: 0.7 }}
                  >
                    <motion.img
                      src={feedItem.thumbnail}
                      alt={feedItem.title}
                      className={`w-full max-h-[450px] object-cover ${
                        isModal ? "drop-shadow-lg" : ""
                      }`}
                      style={
                        parallaxOffset !== undefined
                          ? {
                              transform: `translateY(${parallaxOffset}px)`,
                            }
                          : undefined
                      }
                      loading={isModal ? "eager" : "lazy"}
                      onLoad={() => setImageLoaded(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: imageLoaded ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </Ambilight>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Reader View Header */}
        <div className={`${className || "w-full md:max-w-4xl m-auto"}`}>
          {/* Mobile compact view header */}
          {isCompact ? (
            <div className="mb-4">
              {/* Title - Loading State */}
              {loading ? (
                <div className="mb-2">
                  <Skeleton className="h-6 w-full mb-1" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : (
                readerView?.title && (
                  <motion.h1 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-fluid-xl font-bold mb-2 text-left leading-fluid-tight"
                  >
                    {readerView.title}
                  </motion.h1>
                )
              )}
              
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-fluid-sm text-muted-foreground flex-1 min-w-0">
                  {loading ? (
                    <>
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-24" />
                      <div className="w-px h-5 bg-border mx-1" />
                      <Skeleton className="w-5 h-5 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : (
                    <>
                      {/* Site Info */}
                      {feedItem.favicon && (
                        <SiteFavicon
                          favicon={feedItem.favicon}
                          siteTitle={feedItem.siteTitle}
                          size="small"
                          priority={isModal}
                        />
                      )}
                      <span className="truncate block" title={feedItem.siteTitle}>
                        {feedItem.siteTitle}
                      </span>
                      
                      {/* Vertical Divider */}
                      {extractedAuthor && (
                        <div className="w-px h-5 bg-border mx-1" />
                      )}
                      
                      {/* Author Info */}
                      {extractedAuthor && (
                        <div className="flex items-center gap-1">
                          {extractedAuthor.image && (
                            <Image
                              src={extractedAuthor.image}
                              alt={extractedAuthor.name}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <span className="text-fluid-xs font-medium text-foreground truncate">
                            {extractedAuthor.name}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {loading ? (
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex gap-1"
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleReadLater}
                      className="h-8 w-8"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${
                          isInReadLaterList ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
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
                      <a
                        href={feedItem.link}
                        title="Open in new tab"
                        aria-label="Open in new tab"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </motion.div>
                )}
              </div>
              
              {/* Reading Time */}
              {loading ? (
                <Skeleton className="h-4 w-32 mt-2" />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <ReadingTime content={readerView?.content} markdown={readerView?.markdown} />
                </motion.div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 text-fluid-sm text-muted-foreground flex-1 min-w-0">
                  {loading ? (
                    <>
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <div className="w-px h-6 bg-border mx-2" />
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </>
                  ) : (
                    <>
                      {/* Site Info */}
                      {feedItem.favicon && (
                        <SiteFavicon
                          favicon={feedItem.favicon}
                          siteTitle={feedItem.siteTitle}
                          size={isModal ? "medium" : "small"}
                          priority={isModal}
                        />
                      )}
                      <span
                        className="truncate block"
                        title={feedItem.siteTitle}
                      >
                        {feedItem.siteTitle}
                      </span>
                      
                      {/* Vertical Divider */}
                      {extractedAuthor && (
                        <div className="w-px h-6 bg-border mx-2" />
                      )}
                      
                      {/* Author Info */}
                      {extractedAuthor && (
                        <div className="flex items-center gap-2">
                          {extractedAuthor.image && (
                            <Image
                              src={extractedAuthor.image}
                              alt={extractedAuthor.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <span className="text-fluid-sm font-medium text-foreground truncate">
                            {extractedAuthor.name}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {loading ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ) : (
                  actions || (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="flex gap-2"
                    >
                      <Button size="sm" variant="ghost" onClick={handleReadLater}>
                        <Bookmark
                          className={`h-4 w-4 mr-1 ${
                            isInReadLaterList ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        {isInReadLaterList ? "Read Later" : "Read Later"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a
                          href={feedItem.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </a>
                      </Button>
                    </motion.div>
                  )
                )}
              </div>

              {/* Title */}
              {loading ? (
                <div className="mb-4">
                  <Skeleton className={`h-8 w-full mb-2 ${isModal ? "md:h-10" : ""}`} />
                  <Skeleton className={`h-8 w-3/4 ${isModal ? "md:h-10" : ""}`} />
                </div>
              ) : (
                readerView?.title && (
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className={
                      isModal
                        ? "text-fluid-3xl font-bold mb-2 text-left leading-fluid-tight"
                        : "text-fluid-2xl font-bold mb-3 text-left leading-fluid-tight"
                    }
                    id={isModal ? "reader-view-title" : undefined}
                  >
                    {readerView.title}
                  </motion.h1>
                )
              )}

              {/* Reading Time */}
              {loading ? (
                <Skeleton className="h-4 w-32 mb-6" />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <ReadingTime content={readerView?.content} markdown={readerView?.markdown} />
                </motion.div>
              )}
            </>
          )}
        </div>
      </>
    );
  }
);
ArticleHeader.displayName = "ArticleHeader";

// Article content component
export const ArticleContent = memo(
  ({ 
    content, 
    markdown, 
    className, 
    loading = false 
  }: { 
    content: string; 
    markdown?: string; 
    className?: string; 
    loading?: boolean;
  }) => {
    // Custom components for react-markdown with enhanced styling for reader view
    const components = useMemo(() => ({
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-fluid-3xl font-bold mt-8 mb-6 leading-fluid-tight">{children}</h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-fluid-2xl font-semibold mt-8 mb-4 leading-fluid-tight">{children}</h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-fluid-xl font-semibold mt-6 mb-3 leading-fluid-tight">{children}</h3>
      ),
      h4: ({ children }: { children: React.ReactNode }) => (
        <h4 className="text-fluid-lg font-semibold mt-4 mb-2 leading-fluid-normal">{children}</h4>
      ),
      p: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
        // Check if children contains images and handle differently
        const hasImages = React.Children.toArray(children).some(
          child => React.isValidElement(child) && child.type === 'img'
        );
        
        if (hasImages) {
          return <div className="my-4 text-foreground/90" {...props}>{children}</div>;
        }
        
        return <p className="my-4 text-foreground/90" {...props}>{children}</p>;
      },
      img: ({ src, alt = '', ...props }: { src?: string; alt?: string; [key: string]: unknown }) => {
        if (!src) return null;
        // Use a regular img tag to avoid Next.js Image component div wrapper issues
        return (
          <img
            src={src}
            alt={alt}
            className="w-full h-auto object-cover rounded-lg my-8 max-w-full block"
            loading="lazy"
            {...props}
          />
        );
      },
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-primary/30 pl-6 py-2 my-6 italic text-foreground/80 bg-muted/20 rounded-r-lg">
          {children}
        </blockquote>
      ),
      code: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => {
        const isInline = !className || !className.includes('language-');
        if (isInline) {
          return (
            <code className="bg-muted px-2 py-1 rounded text-fluid-sm font-mono text-primary" {...props}>
              {children}
            </code>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children }: { children: React.ReactNode }) => (
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-6 text-sm font-mono border">
          {children}
        </pre>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc pl-6 my-4 space-y-2">{children}</ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal pl-6 my-4 space-y-2">{children}</ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
      a: ({ href, children, ...props }: { href?: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a 
          href={href} 
          className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      ),
    }), []);

    if (loading) {
      return (
        <div className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-foreground px-6 md:px-8 lg:px-12 ${
          className || "w-full md:max-w-4xl"
        }`}>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            
            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            
            {/* Simulated image in content */}
            <div className="my-8">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            
            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>
            
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      );
    }

    // Prefer markdown if available, fallback to HTML content
    const shouldUseMarkdown = markdown && markdown.trim() !== '';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`prose prose-amber text-base prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-foreground px-6 md:px-8 lg:px-12 ${
          className || "w-full md:max-w-4xl"
        }`}
      >
        {shouldUseMarkdown ? (
          <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            allowedElements={undefined}
            disallowedElements={[]}
          >
            {markdown}
          </ReactMarkdown>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: sanitizeReaderContent(content) }} />
        )}
      </motion.div>
    );
  }
);
ArticleContent.displayName = "ArticleContent";

// Deprecated - use ArticleReaderSkeleton instead
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

// Empty state component
export const EmptyState = memo(() => {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex flex-col items-center justify-center h-full p-4 ${
        isMobile ? "p-4" : "p-8"
      }`}
    >
      <div className={`text-center ${isMobile ? "w-full" : "max-w-md"}`}>
        <h3
          className={`font-semibold ${isMobile ? "text-lg" : "text-xl"} mb-2`}
        >
          Select an article
        </h3>
        <p className="text-muted-foreground text-sm">
          Choose an article from the list to view its content here.
        </p>
      </div>
    </div>
  );
});
EmptyState.displayName = "EmptyState";

export function processArticleContent(
  readerView: ReaderViewResponse | null
): { htmlContent: string; markdownContent: string; extractedAuthor?: { name: string; image?: string } } {
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
    extractedAuthor: markdownResult.extractedAuthor
  };
}
