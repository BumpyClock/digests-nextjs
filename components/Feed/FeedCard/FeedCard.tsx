"use client";

import type React from "react";
import { useState, useRef, useCallback, memo, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter as CardFooterUI,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Bookmark } from "lucide-react";
// Removed useAudio import - now using integrated audio from store
import { toast } from "sonner";
import { ReaderViewModal } from "@/components/reader-view-modal";
import { PodcastDetailsModal } from "@/components/Podcast/PodcastDetailsModal";
import { formatDuration } from "@/utils/formatDuration";
import type { FeedItem } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTheme } from "next-themes";
import { workerService } from "@/services/worker-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsItemRead, useIsInReadLater, useReadActions, useReadLaterActions } from "@/hooks/useFeedSelectors";
import { useRenderCount } from "@/store/middleware/performanceMiddleware";
import { cleanupTextContent } from "@/utils/htmlUtils";
import { Ambilight } from "@/components/ui/ambilight";
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton";
import { isPodcast } from "@/types/podcast";
import { getImageKitUrl, IMAGE_PRESETS, canUseImageKit } from "@/utils/imagekit";
import { motion, AnimatePresence } from "motion/react";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { springConfig } from "@/utils/animation-config";
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
      toast("Removed from Read Later", {
        description: "The article has been removed from your reading list.",
      });
    } else {
      addToReadLater(feedItem.id);
      toast("Added to Read Later", {
        description: "The article has been added to your reading list.",
      });
    }
    // State update handled by store
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
          onClick={handleReadLater}
        >
          <Bookmark
            className={`h-4 w-4 ${isInReadLaterList ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="sr-only">Read Later</span>
        </Button>
      
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={handleShare}
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
  // Track render count in development (always call hook to avoid conditional calling)
  const renderCountEnabled = process.env.NODE_ENV === 'development';
  useRenderCount(renderCountEnabled ? `FeedCard-${feedItem.id}` : '');
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false);
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false);
  const [initialPosition, setInitialPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
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
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout>(null);
  const transitionDuration = 100; // Reduced for snappier animation
  const [imageLoading, setImageLoading] = useState(true);
  const isRead = useIsItemRead(feedItem.id);
  const { markAsRead } = useReadActions();
  
  // Animation context
  const { activeItemId, setActiveItemId, animationEnabled } = useFeedAnimation();
  const isActive = activeItemId === feedItem.id;

  /**
   * Handles the click event on the card.
   *
   * @param {React.MouseEvent<HTMLDivElement>} e - The click event.
   */
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!isAnimating) {
      setIsPressed(true);

      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setInitialPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }, [isAnimating]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPressed) {
      setIsPressed(false);
      setIsAnimating(true);

      // Check if the click was on a share or bookmark button
      const target = e.target as HTMLElement;
      const isShareOrBookmarkButton = target.closest('button')?.querySelector('.h-4.w-4');
      
      if (!isShareOrBookmarkButton) {
        setTimeout(() => {
          markAsRead(feedItem.id);
        }, 0);

        // Set active item for animation
        if (animationEnabled) {
          setActiveItemId(feedItem.id);
        }

        const timeout = setTimeout(() => {
          if (isPodcast(feedItem)) {
            setIsPodcastDetailsOpen(true);
          } else {
            setIsReaderViewOpen(true);
          }
          setIsAnimating(false);
        }, transitionDuration);

        animationTimeoutRef.current = timeout;
      } else {
        setIsAnimating(false);
      }
    }
  }, [feedItem, isPressed, markAsRead, animationEnabled, setActiveItemId]);

  useEffect(() => {
    return () => {
      const timeout = animationTimeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);



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

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getShadowStyle = () => {
    if (isPressed) return pressedShadow;
    if (isHovered) return hoverShadow;
    return restShadow;
  };

  // Generate the FeedCard thumbnail URL that's already been loaded
  const feedCardThumbnailUrl = useMemo(() => {
    if (showPlaceholder) {
      return isPodcast(feedItem) ? "/placeholder-podcast.svg" : "/placeholder-rss.svg";
    }
    if (canUseImageKit(feedItem.thumbnail)) {
      return getImageKitUrl(feedItem.thumbnail, IMAGE_PRESETS.feedCardThumbnail);
    }
    return feedItem.thumbnail;
  }, [feedItem, showPlaceholder]);

  // Track if card is ready to be visible (prevents slide animations)
  const [isReadyToShow, setIsReadyToShow] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure card is positioned by Masonic before showing
    const timer = setTimeout(() => {
      setIsReadyToShow(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Always enable layoutIds when animations are enabled for connected animations
  const shouldEnableLayoutId = animationEnabled;
  
  // Use motion.div directly instead of wrapping Card
  const CardWrapper = animationEnabled ? motion.div : 'div';

  return (
    <>
      <CardWrapper
        layoutId={shouldEnableLayoutId ? `card-${feedItem.id}` : undefined}
        whileHover={animationEnabled && isReadyToShow ? { y: -4 } : undefined}
        whileTap={animationEnabled && isReadyToShow ? { scale: 0.98 } : undefined}
        transition={shouldEnableLayoutId ? springConfig.controlled : undefined}
        initial={animationEnabled ? { opacity: 0, y: 50 } : false}
        animate={animationEnabled ? { opacity: isReadyToShow ? 1 : 0, y: isReadyToShow ? 0 : 50 } : undefined}
        data-motion="card"
      >
        <Card
          ref={cardRef}
          style={
            {
              boxShadow: getShadowStyle(),
              transition: shouldEnableLayoutId ? undefined : "opacity 200ms ease-out, box-shadow 100ms ease-out, transform 100ms ease-out",
              transform: isPressed && !animationEnabled ? "translateY(2px)" : "none",
              opacity: isRead ? 0.8 : 1,
            } as React.CSSProperties
          }
          className={`card w-full bg-card overflow-hidden cursor-pointer rounded-[40px] relative group ${isRead ? "read-item" : ""} ${isReadyToShow ? "ready" : ""
            }`}
          onClick={handleCardClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
            setIsAnimating(false);
            if (animationTimeoutRef.current) {
              clearTimeout(animationTimeoutRef.current);
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
        >
        {/* <div
          id={`feed-card-bg-${feedItem.id}`}
          className="absolute inset-0 overflow-hidden z-0"
        >
          <div 
            className="w-full h-full opacity-10 dark:opacity-15 group-hover:opacity-20 group-hover:dark:opacity-25 transition-all"
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
            <motion.div 
              className="relative w-full p-2"
              layoutId={shouldEnableLayoutId ? `thumbnail-container-${feedItem.id}` : undefined}
              initial={false}
              animate={false}
              data-motion="thumbnail-container"
            >
              <Ambilight
  className="relative w-full aspect-[16/9] rounded-[32px] overflow-hidden"
  parentHovered={isHovered}
  opacity={{ rest: 0, hover: 0.7 }}
>
                {imageLoading && (
                  <Skeleton className="absolute inset-0 z-10 rounded-[32px]" />
                )}
                <motion.img
                  layoutId={shouldEnableLayoutId ? `thumbnail-${feedItem.id}` : undefined}
                  src={showPlaceholder 
                    ? (isPodcast(feedItem) ? "/placeholder-podcast.svg" : "/placeholder-rss.svg") 
                    : (canUseImageKit(feedItem.thumbnail) 
                        ? getImageKitUrl(feedItem.thumbnail, IMAGE_PRESETS.feedCardThumbnail)
                        : feedItem.thumbnail)
                  }
                  alt={feedItem.title}
                  width={400}
                  height={300}
                  className={`w-full h-full object-cover rounded-[32px] ${shouldEnableLayoutId ? '' : (isReadyToShow ? 'group-hover:scale-[1.05] transition-all duration-150' : '')} ${
                    imageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  onError={handleImageError}
                  onLoad={() => setImageLoading(false)}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  loading="lazy"
                  transition={shouldEnableLayoutId ? { layout: springConfig.stiff } : undefined}
                  initial={false}
                  animate={false}
                  data-motion="thumbnail"
                />
              </Ambilight>
            </motion.div>
          )}

          <CardContent className="p-4">
            <div className="space-y-2">
              <div
                id={`feed-card-header-${feedItem.id}`}
                className="flex flex-wrap items-center justify-between gap-2 font-regular"
              >
                <motion.div 
                  className="flex space-between gap-2 align-center items-center"
                  layoutId={shouldEnableLayoutId ? `metadata-${feedItem.id}` : undefined}
                  initial={false}
                  animate={false}
                  data-motion="metadata"
                >
                  {(!faviconError && feedItem.favicon && isValidUrl(feedItem.favicon)) ? (
                    <motion.img
                      layoutId={shouldEnableLayoutId ? `favicon-${feedItem.id}` : undefined}
                      src={feedItem.favicon}
                      alt={`${cleanupTextContent(feedItem.siteTitle)} favicon`}
                      className="w-6 h-6 bg-white rounded-[4px] "
                      onError={handleFaviconError}
                      width={24}
                      height={24}
                      initial={false}
                      animate={false}
                      data-motion="favicon"
                    />
                  ) : (
                    <motion.div 
                      className="w-6 h-6 bg-muted rounded-[4px] flex items-center justify-center text-xs font-medium"
                      layoutId={shouldEnableLayoutId ? `favicon-${feedItem.id}` : undefined}
                      initial={false}
                      animate={false}
                      data-motion="favicon"
                    >
                      {cleanupTextContent(feedItem.siteTitle).charAt(0).toUpperCase()}
                    </motion.div>
                  )}
                  <motion.div 
                    className="text-xs  line-clamp-1 font-regular"
                    layoutId={shouldEnableLayoutId ? `site-title-${feedItem.id}` : undefined}
                    initial={false}
                    animate={false}
                    data-motion="site-title"
                  >
                    {cleanupTextContent(feedItem.siteTitle)}
                  </motion.div>
                </motion.div>
                <div className="text-xs text-muted-foreground w-fit font-medium">
                  {formatDate(feedItem.published)}
                </div>
              </div>
              <motion.h3 
                className="font-medium"
                layoutId={shouldEnableLayoutId ? `title-${feedItem.id}` : undefined}
                initial={false}
                animate={false}
                data-motion="title"
              >
                {cleanupTextContent(feedItem.title)}
              </motion.h3>
              <AnimatePresence>
                {!isActive && (
                  <>
                    {feedItem.author && (
                      <motion.div 
                        className="text-sm text-muted-foreground"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        By {cleanupTextContent(feedItem.author)}
                      </motion.div>
                    )}
                    <motion.p 
                      className="text-sm text-muted-foreground line-clamp-3"
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {cleanupTextContent(feedItem.description)}
                    </motion.p>
                  </>
                )}
              </AnimatePresence>
            </div>
          </CardContent>

          <AnimatePresence>
            {!isActive && animationEnabled && (
              <motion.div
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardFooter feedItem={feedItem} />
              </motion.div>
            )}
            {!animationEnabled && <CardFooter feedItem={feedItem} />}
          </AnimatePresence>
        </div>
        </Card>
      </CardWrapper>
      {isPodcast(feedItem) ? (
        <PodcastDetailsModal
          isOpen={isPodcastDetailsOpen}
          onClose={() => {
            setIsPodcastDetailsOpen(false)
            if (animationEnabled) {
              setActiveItemId(null)
            }
          }}
          podcast={feedItem}
          initialPosition={initialPosition}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => {
            setIsReaderViewOpen(false)
            if (animationEnabled) {
              setActiveItemId(null)
            }
          }}
          feedItem={feedItem}
          initialPosition={initialPosition}
          initialThumbnailSrc={feedCardThumbnailUrl}
        />
      )}
    </>
  );
});
