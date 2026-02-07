"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bookmark, Share2 } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import { useTheme } from "next-themes";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { PodcastDetailsModal } from "@/components/Podcast/PodcastDetailsModal";
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton";
// Removed useAudio import - now using integrated audio from store
import { ReaderViewModal } from "@/components/reader-view-modal";
import { Ambilight } from "@/components/ui/ambilight";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter as CardFooterUI } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { useIsInReadLater, useIsItemRead, useReadLaterActions } from "@/hooks/useFeedSelectors";
import { getFeedAnimationIds } from "@/lib/feed-animation-ids";
import {
  getViewTransitionStyle,
  runWithViewTransition,
  supportsViewTransitions,
} from "@/lib/view-transitions";
import { workerService } from "@/services/worker-service";
import type { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import { handleShare, showReadLaterToast } from "@/utils/content-actions";
import { formatDuration } from "@/utils/formatDuration";
import { cleanupTextContent, getSiteDisplayName } from "@/utils/htmlUtils";
import { canUseImageKit, getImageKitUrl, IMAGE_PRESETS } from "@/utils/imagekit";
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
const CardFooter = memo(function CardFooter({ feedItem }: { feedItem: FeedItem }) {
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
          <PodcastPlayButton podcast={feedItem} variant="ghost" size="icon" className="h-8 w-8" />
        )}

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReadLater}>
          <Bookmark className={`h-4 w-4 ${isInReadLaterList ? "fill-red-500 text-red-500" : ""}`} />
          <span className="sr-only">Read Later</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </div>
      {isPodcast(feedItem) && feedItem.duration && (
        <div className="text-xs text-muted-foreground">
          {Number.isFinite(Number(feedItem.duration))
            ? formatDuration(Number(feedItem.duration))
            : feedItem.duration}
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
export const FeedCard = memo(function FeedCard({ feed: feedItem }: FeedCardProps) {
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false);
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false);
  const [viewTransitionsSupported, setViewTransitionsSupported] = useState(false);
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
  const animationIds = getFeedAnimationIds(feedItem.id);
  const viewTransitionsEnabled = animationEnabled && viewTransitionsSupported;
  const motionLayoutEnabled = animationEnabled && !viewTransitionsEnabled;
  const cardViewTransitionEnabled = viewTransitionsEnabled && !isReaderViewOpen;

  useEffect(() => {
    setViewTransitionsSupported(supportsViewTransitions());
  }, []);

  /**
   * Handles the click event on the card.
   */
  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Check if the click was on a share or bookmark button
      const target = e.target as HTMLElement;
      const isShareOrBookmarkButton = target.closest("button");

      if (!isShareOrBookmarkButton) {
        // Open the appropriate modal; marking as read is now handled inside the reader view
        // Open appropriate modal
        if (isPodcast(feedItem)) {
          setIsPodcastDetailsOpen(true);
        } else {
          if (viewTransitionsEnabled) {
            runWithViewTransition(() => {
              setIsReaderViewOpen(true);
            });
          } else {
            setIsReaderViewOpen(true);
          }
        }
      }
    },
    [feedItem, viewTransitionsEnabled]
  );

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
    <LayoutGroup id={`feed-layout-${feedItem.id}`}>
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
              transition:
                "opacity var(--motion-duration-normal, 200ms) var(--motion-ease-decelerate, ease-out), box-shadow var(--motion-duration-fast, 120ms) var(--motion-ease-decelerate, ease-out), transform var(--motion-duration-fast, 120ms) var(--motion-ease-decelerate, ease-out)",
              transform: isPressed ? "translateY(2px)" : "none",
              opacity: isRead ? 0.8 : 1,
            } as React.CSSProperties
          }
          className={`card w-full bg-card overflow-hidden cursor-pointer rounded-4xl relative group ${isRead ? "read-item" : ""}`}
          onClick={handleCardClick}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
        >
          <div id={`feed-card-image-${feedItem.id}`} className="relative z-10 ">
            {/* Card Thumbnail image*/}
            {((!imageError && feedItem.thumbnail && isValidUrl(feedItem.thumbnail)) ||
              showPlaceholder) && (
              <motion.div
                className="relative w-full p-2"
                layoutId={motionLayoutEnabled ? animationIds.thumbnail : undefined}
                style={getViewTransitionStyle(cardViewTransitionEnabled, animationIds.thumbnail)}
              >
                <Ambilight
                  className="relative w-full aspect-video rounded-3xl overflow-hidden"
                  parentHovered={isHovered}
                  opacity={{ rest: 0, hover: 0.7 }}
                >
                  {imageLoading && <Skeleton className="absolute inset-0 z-10 rounded-3xl" />}
                  <Image
                    src={
                      showPlaceholder
                        ? isPodcast(feedItem)
                          ? "/placeholder-podcast.svg"
                          : "/placeholder-rss.svg"
                        : canUseImageKit(feedItem.thumbnail)
                          ? getImageKitUrl(feedItem.thumbnail, IMAGE_PRESETS.feedCardThumbnail)
                          : feedItem.thumbnail
                    }
                    alt={feedItem.title}
                    width={400}
                    height={300}
                    className={`w-full h-full object-cover rounded-3xl group-hover:scale-[1.05] transition-token-transform duration-fast ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onError={() => handleImageError()}
                    onLoad={() => setImageLoading(false)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    loading="lazy"
                  />
                </Ambilight>
              </motion.div>
            )}

            <CardContent className="p-4">
              <div className="space-y-2">
                <div
                  id={`feed-card-header-${feedItem.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 font-normal"
                >
                  <motion.div
                    className="flex space-between gap-2 align-center items-center"
                    layoutId={motionLayoutEnabled ? animationIds.siteMeta : undefined}
                    style={getViewTransitionStyle(cardViewTransitionEnabled, animationIds.siteMeta)}
                  >
                    <motion.div
                      layoutId={motionLayoutEnabled ? animationIds.favicon : undefined}
                      style={getViewTransitionStyle(
                        cardViewTransitionEnabled,
                        animationIds.favicon
                      )}
                    >
                      {!faviconError && feedItem.favicon && isValidUrl(feedItem.favicon) ? (
                        <Image
                          src={feedItem.favicon}
                          alt={`${cleanupTextContent(getSiteDisplayName(feedItem))} favicon`}
                          className="w-6 h-6 bg-background rounded-sm"
                          onError={() => handleFaviconError()}
                          width={24}
                          height={24}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-muted rounded-sm flex items-center justify-center text-xs font-medium">
                          {cleanupTextContent(getSiteDisplayName(feedItem)).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                    <motion.div
                      className="text-xs line-clamp-1 font-normal"
                      layoutId={motionLayoutEnabled ? animationIds.siteName : undefined}
                      style={getViewTransitionStyle(
                        cardViewTransitionEnabled,
                        animationIds.siteName
                      )}
                    >
                      {cleanupTextContent(getSiteDisplayName(feedItem))}
                    </motion.div>
                  </motion.div>
                  <div className="text-xs text-muted-foreground w-fit font-medium">
                    {formatDate(feedItem.published)}
                  </div>
                </div>
                <motion.h3
                  className="font-medium"
                  layoutId={motionLayoutEnabled ? animationIds.title : undefined}
                  style={getViewTransitionStyle(cardViewTransitionEnabled, animationIds.title)}
                >
                  {cleanupTextContent(feedItem.title)}
                </motion.h3>
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
            setIsPodcastDetailsOpen(false);
          }}
          podcast={feedItem}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => {
            if (viewTransitionsEnabled) {
              runWithViewTransition(() => {
                setIsReaderViewOpen(false);
              });
            } else {
              setIsReaderViewOpen(false);
            }
          }}
          feedItem={feedItem}
        />
      )}
    </LayoutGroup>
  );
});
