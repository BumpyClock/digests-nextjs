"use client";

import React, { memo, useState } from "react";
import "../ArticleReader/ArticleReader.css";
import { FeedItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedStore } from "@/store/useFeedStore";
import { toast } from "sonner";
import { motion } from "motion/react";
import { extractYouTubeVideoId, createYouTubeEmbedUrl } from "@/utils/youtube";
import { ArticleHeader } from "@/components/Feed/ArticleReader/ArticleReader";

interface YouTubeViewerProps {
  feedItem: FeedItem;
  layout?: "standard" | "compact" | "modal";
  parallaxOffset?: number;
  className?: string;
  loading?: boolean;
}

export const YouTubeViewer = memo(function YouTubeViewer({
  feedItem,
  layout = "standard",
  parallaxOffset,
  className = "",
  loading = false,
}: YouTubeViewerProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { addToReadLater, removeFromReadLater, isInReadLater } = useFeedStore();
  const [isInReadLaterList, setIsInReadLaterList] = useState(false);

  React.useEffect(() => {
    setIsInReadLaterList(isInReadLater(feedItem.id));
  }, [feedItem.id, isInReadLater]);

  const videoId = extractYouTubeVideoId(feedItem.link);
  const embedUrl = videoId ? createYouTubeEmbedUrl(videoId) : null;

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
          description: "The link to this video has been copied to your clipboard.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Error sharing", {
          description: "Failed to share the video. Please try again.",
        });
      }
    }
  };

  const handleReadLater = () => {
    if (isInReadLaterList) {
      removeFromReadLater(feedItem.id);
      setIsInReadLaterList(false);
      toast("Removed from Watch Later", {
        description: "The video has been removed from your watch list.",
      });
    } else {
      addToReadLater(feedItem.id);
      setIsInReadLaterList(true);
      toast("Added to Watch Later", {
        description: "The video has been added to your watch list.",
      });
    }
  };

  const isModal = layout === "modal";
  const isCompact = layout === "compact";

  // Use increased padding for modal layout
  const containerPadding =
    layout === "modal"
      ? "px-2 py-2 md:px-6 md:py-2 lg:px-2"
      : isCompact
      ? "px-3 py-4"
      : "p-2";

  return (
    <div className={`${containerPadding} ${className}`}>
      <article>
        {/* YouTube Video Header - reuse ArticleHeader but with YouTube-specific actions */}
        <div className={`w-full ${isModal ? "md:max-w-6xl" : "md:max-w-4xl"} m-auto`}>
          {/* Site info and metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 text-fluid-sm text-muted-foreground flex-1 min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  {feedItem.favicon && (
                    <img
                      src={feedItem.favicon}
                      alt={feedItem.siteTitle}
                      className={`rounded ${
                        isModal ? "max-h-6 max-w-6" : "max-h-5 max-w-5"
                      }`}
                      width={isModal ? 24 : 20}
                      height={isModal ? 24 : 20}
                    />
                  )}
                  <span className="truncate block" title={feedItem.siteTitle}>
                    {feedItem.siteTitle}
                  </span>
                </>
              )}
            </div>

            {/* YouTube-specific actions */}
            {loading ? (
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
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
                  {isInReadLaterList ? "Watch Later" : "Watch Later"}
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
                    YouTube
                  </a>
                </Button>
              </motion.div>
            )}
          </div>

          {/* Video Title */}
          {loading ? (
            <div className="mb-6">
              <Skeleton className={`h-8 w-full mb-2 ${isModal ? "md:h-10" : ""}`} />
              <Skeleton className={`h-8 w-3/4 ${isModal ? "md:h-10" : ""}`} />
            </div>
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={
                isModal
                  ? "text-fluid-3xl font-bold mb-6 text-left leading-fluid-tight"
                  : "text-fluid-2xl font-bold mb-4 text-left leading-fluid-tight"
              }
              id={isModal ? "youtube-viewer-title" : undefined}
            >
              {feedItem.title}
            </motion.h1>
          )}

          {/* YouTube Video Embed */}
          {loading ? (
            <Skeleton className={`w-full rounded-lg mb-6 ${
              isModal ? "h-[500px]" : "h-[400px]"
            }`} />
          ) : embedUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="relative mb-6"
            >
              {!videoLoaded && (
                <Skeleton className={`absolute inset-0 z-10 rounded-lg ${
                  isModal ? "h-[500px]" : "h-[400px]"
                }`} />
              )}
              <iframe
                src={embedUrl}
                title={feedItem.title}
                className={`youtube-viewer ${
                  isModal ? "h-[500px]" : "h-[400px]"
                } ${videoLoaded ? "opacity-100" : "opacity-0"}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                onLoad={() => setVideoLoaded(true)}
                style={{
                  transition: "opacity 0.3s ease-in-out",
                }}
              />
            </motion.div>
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center mb-6">
              <p className="text-muted-foreground">
                Unable to load YouTube video. Please try opening it directly.
              </p>
              <Button className="mt-4" asChild>
                <a href={feedItem.link} target="_blank" rel="noopener noreferrer">
                  Open on YouTube
                </a>
              </Button>
            </div>
          )}

          {/* Video Description */}
          {feedItem.description && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="prose prose-amber text-base prose-lg dark:prose-invert max-w-none"
            >
              <div
                className="text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: feedItem.description }}
              />
            </motion.div>
          )}
        </div>
      </article>
    </div>
  );
});

YouTubeViewer.displayName = "YouTubeViewer";