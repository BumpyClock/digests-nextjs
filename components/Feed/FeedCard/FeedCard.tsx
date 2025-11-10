"use client";

import type React from "react";
import { useState, useRef, useCallback, memo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter as CardFooterUI,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Bookmark } from "lucide-react";
// Removed useAudio import - now using integrated audio from store
import { ReaderViewModal } from "@/components/reader-view-modal";
import { handleShare, showReadLaterToast } from "@/utils/content-actions";
import { PodcastDetailsModal } from "@/components/Podcast/PodcastDetailsModal";
import { formatDuration } from "@/utils/formatDuration";
import type { FeedItem } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTheme } from "next-themes";
import { workerService } from "@/services/worker-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsItemRead, useIsInReadLater, useReadLaterActions } from "@/hooks/useFeedSelectors";
import { cleanupTextContent } from "@/utils/htmlUtils";
import { Ambilight } from "@/components/ui/ambilight";
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton";
import { isPodcast } from "@/types/podcast";
import { getImageKitUrl, IMAGE_PRESETS, canUseImageKit } from "@/utils/imagekit";
import { motion } from "motion/react";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import Image from "next/image";
import { isValidUrl } from "@/utils/url";
dayjs.extend(relativeTime);

interface FeedCardProps {
  feed: FeedItem;
}

/**
 * CardFooter component for displaying action buttons (play, bookmark, share).
 *
 * @param {Object} props - Component props.
 * @param {string} props.feedType - Type of the feed item (e.g., podcast).
 * @param {number} [props.duration] - Duration of the podcast, if applicable.
 * @param {FeedItem} props.feedItem - The feed item data.
 * @param {boolean} props.isCurrentlyPlaying - Indicates if this podcast is currently playing.
 * @param {function} props.onPlayClick - Function to handle play button click.
 */
const CardFooter = memo(function CardFooter({
  feedItem,
}: {
  feedItem: FeedItem;
}) {
  const isInReadLaterList = useIsInReadLater(feedItem.id);
  const { addToReadLater, removeFromReadLater } = useReadLaterActions();

  const onShare = () => {
    handleShare(
      feedItem.link,
      feedItem.title,
      feedItem.description,
      isPodcast(feedItem) ? "podcast" : "article"
    );
  };

  const onReadLater = () => {
    const wasInReadLater = isInReadLaterList;
    if (wasInReadLater) {
      removeFromReadLater(feedItem.id);
    } else {
      addToReadLater(feedItem.id);
    }
    showReadLaterToast(wasInReadLater, isPodcast(feedItem) ? "podcast" : "article");
  };

  return (
    <CardFooterUI className="p-4 pt-0 flex justify-between">
      <div className="flex space-x-2">
        {isPodcast(feedItem) && (
          <PodcastPlayButton
            podcast={feedItem}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onReadLater}
        >
          <Bookmark
            className={`h-4 w-4 ${isInReadLaterList ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="sr-only">Read Later</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </div>
      {isPodcast(feedItem) && feedItem.duration && (
        <div className="text-xs text-muted-foreground">
          {formatDuration(feedItem.duration)}
        </div>
      )}
    </CardFooterUI>
  );
});

function useCardShadow(id: string, color: { r: number; g: number; b: number }) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [shadows, setShadows] = useState({
    restShadow: "",
    hoverShadow: "",
    pressedShadow: "",
  });

  useEffect(() => {
    workerService
      .generateShadows(id, color, isDarkMode)
      .then((newShadows) => {
        setShadows(newShadows);
      })
      .catch((error) => {
        console.error("Error generating shadows:", error);
      });
  }, [id, color, isDarkMode]);

  return shadows;
}

/**
 * FeedCard component for displaying individual feed items.
 *
 * @param {Object} props - Component props.
 * @param {FeedItem} props.feed - The feed item to display.
 */
export const FeedCard = memo(function FeedCard({
  feed: feedItem,
}: FeedCardProps) {
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false);
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { restShadow, hoverShadow, pressedShadow } = useCardShadow(
    feedItem.id,
    feedItem.thumbnailColor || { r: 0, g: 0, b: 0 }
  );
  const [imageLoading, setImageLoading] = useState(true);
  const isRead = useIsItemRead(feedItem.id);

  // Animation context
  const { animationEnabled } = useFeedAnimation();

  /**
   * Handles the click event on the card.
   */
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click was on a share or bookmark button
    const target = e.target as HTMLElement;
    const isShareOrBookmarkButton = target.closest('button');

    if (!isShareOrBookmarkButton) {
      // Open the appropriate modal; marking as read is now handled inside the reader view
      // Open appropriate modal
      if (isPodcast(feedItem)) {
        setIsPodcastDetailsOpen(true);
      } else {
        setIsReaderViewOpen(true);
      }
    }
  }, [feedItem]);



  const formatDate = useCallback((dateString: string) => {
    return dayjs(dateString).fromNow();
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setShowPlaceholder(true);
  }, []);

  const handleFaviconError = useCallback(() => {
    setFaviconError(true);
  }, []);

  const getShadowStyle = () => {
    if (isPressed) return pressedShadow;
    if (isHovered) return hoverShadow;
    return restShadow;
  };



  return (
    <>
      <motion.div
        whileHover={animationEnabled ? { y: -4 } : undefined}
        whileTap={animationEnabled ? { scale: 0.98 } : undefined}
        initial={animationEnabled ? { opacity: 0, y: 20 } : undefined}
        animate={animationEnabled ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.2 }}
      >
        <Card
          ref={cardRef}
          style={
            {
              boxShadow: getShadowStyle(),
              transition: "opacity 200ms ease-out, box-shadow 100ms ease-out, transform 100ms ease-out",
              transform: isPressed ? "translateY(2px)" : "none",
              opacity: isRead ? 0.8 : 1,
            } as React.CSSProperties
          }
          className={`card w-full bg-card overflow-hidden cursor-pointer rounded-[40px] relative group ${isRead ? "read-item" : ""}`}
          onClick={handleCardClick}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
        >
        {/* <div
          id={`feed-card-bg-${feedItem.id}`}
          className="absolute inset-0 overflow-hidden z-0"
        >
          <div 
            className="w-full h-full opacity-10 dark:opacity-15 group-hover:opacity-20 dark:group-hover:opacity-25 transition-all"
            style={{
              backgroundColor: feedItem.thumbnailColor ? tinycolor({ r: feedItem.thumbnailColor.r, g: feedItem.thumbnailColor.g, b: feedItem.thumbnailColor.b }).toRgbString() : 'transparent',
             
            }}
          />
        </div> */}

        <div
          id={`feed-card-image-${feedItem.id}`}
          className="relative z-10 "
        >
          {/* Card Thumbnail image*/}
          {((!imageError && feedItem.thumbnail && isValidUrl(feedItem.thumbnail)) || showPlaceholder) && (
            <div className="relative w-full p-2">
              <Ambilight
                className="relative w-full aspect-video rounded-[32px] overflow-hidden"
                parentHovered={isHovered}
                opacity={{ rest: 0, hover: 0.7 }}
              >
                {imageLoading && (
                  <Skeleton className="absolute inset-0 z-10 rounded-[32px]" />
                )}
                <Image
                  src={showPlaceholder 
                    ? (isPodcast(feedItem) ? "/placeholder-podcast.svg" : "/placeholder-rss.svg") 
                    : (canUseImageKit(feedItem.thumbnail) 
                        ? getImageKitUrl(feedItem.thumbnail, IMAGE_PRESETS.feedCardThumbnail)
                        : feedItem.thumbnail)
                  }
                  alt={feedItem.title}
                  width={400}
                  height={300}
                  className={`w-full h-full object-cover rounded-[32px] group-hover:scale-[1.05] transition-all duration-150 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  onError={() => handleImageError()}
                  onLoad={() => setImageLoading(false)}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  loading="lazy"
                />
              </Ambilight>
            </div>
          )}

          <CardContent className="p-4">
            <div className="space-y-2">
              <div
                id={`feed-card-header-${feedItem.id}`}
                className="flex flex-wrap items-center justify-between gap-2 font-regular"
              >
                <div className="flex space-between gap-2 align-center items-center">
                  {(!faviconError && feedItem.favicon && isValidUrl(feedItem.favicon)) ? (
                    <Image
                      src={feedItem.favicon}
                      alt={`${cleanupTextContent(feedItem.siteTitle)} favicon`}
                      className="w-6 h-6 bg-white rounded-[4px] "
                      onError={() => handleFaviconError()}
                      width={24}
                      height={24}
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted rounded-[4px] flex items-center justify-center text-xs font-medium">
                      {cleanupTextContent(feedItem.siteTitle).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-xs  line-clamp-1 font-regular">
                    {cleanupTextContent(feedItem.siteTitle)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground w-fit font-medium">
                  {formatDate(feedItem.published)}
                </div>
              </div>
              <h3 className="font-medium">
                {cleanupTextContent(feedItem.title)}
              </h3>
              {feedItem.author && (
                <div className="text-sm text-muted-foreground">
                  By {cleanupTextContent(feedItem.author)}
                </div>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {cleanupTextContent(feedItem.description)}
              </p>
            </div>
          </CardContent>

          <CardFooter feedItem={feedItem} />
        </div>
        </Card>
      </motion.div>
      {isPodcast(feedItem) ? (
        <PodcastDetailsModal
          isOpen={isPodcastDetailsOpen}
          onClose={() => {
            setIsPodcastDetailsOpen(false)
          }}
          podcast={feedItem}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => {
            setIsReaderViewOpen(false)
          }}
          feedItem={feedItem}
        />
      )}
    </>
  );
});
