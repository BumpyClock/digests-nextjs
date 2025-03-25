"use client";

import type React from "react";
import { useState, useRef, useCallback, memo, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter as CardFooterUI,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Share2, Play, Pause } from "lucide-react";
import { useAudio } from "@/components/audio-player-provider";
import { useToast } from "@/hooks/use-toast";
import { ReaderViewModal } from "@/components/reader-view-modal";
import { PodcastDetailsModal } from "@/components/podcast-details-modal";
import { formatDuration } from "@/utils/formatDuration";
import type { FeedItem } from "@/types";
import Image from "next/image";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTheme } from "next-themes";
import { workerService } from "@/services/worker-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedStore } from "@/store/useFeedStore";
import { cleanupTextContent } from "@/utils/htmlUtils";
import { Ambilight } from "@/components/ui/ambilight";
dayjs.extend(relativeTime);

interface FeedCardProps {
  feed: FeedItem;
}

/**
 * CardFooter component for displaying like, comment, and share buttons.
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.liked - Indicates if the item is liked.
 * @param {boolean} props.isTogglingFavorite - Indicates if the favorite toggle is in progress.
 * @param {function} props.handleLikeClick - Function to handle like button click.
 * @param {string} props.feedType - Type of the feed item (e.g., podcast).
 * @param {number} [props.duration] - Duration of the podcast, if applicable.
 */
const CardFooter = memo(function CardFooter({
  liked,
  isTogglingFavorite,
  handleLikeClick,
  feedType,
  duration,
}: {
  liked: boolean;
  isTogglingFavorite: boolean;
  handleLikeClick: (e: React.MouseEvent) => void;
  feedType: string;
  duration?: number;
}) {
  return (
    <CardFooterUI className="p-4 pt-0 flex justify-between">
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleLikeClick}
          disabled={isTogglingFavorite}
        >
          <Heart
            className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="sr-only">Like</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MessageSquare className="h-4 w-4" />
          <span className="sr-only">Comment</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </div>
      {feedType === "podcast" && duration && (
        <div className="text-xs text-muted-foreground">
          {formatDuration(duration)}
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
  const [liked, setLiked] = useState(feedItem.favorite || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false);
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false);
  const [initialPosition, setInitialPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const { playAudio, isPlaying, currentAudio } = useAudio();
  const { toast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { restShadow, hoverShadow, pressedShadow } = useCardShadow(
    feedItem.id,
    feedItem.thumbnailColor || { r: 0, g: 0, b: 0 }
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout>(null);
  const transitionDuration = 150; // matches our transition duration in ms
  const [imageLoading, setImageLoading] = useState(true);
  const { markAsRead, readItems } = useFeedStore();
  const isRead = useMemo(() => {
    if (!readItems || !(readItems instanceof Set)) return false;
    return readItems.has(feedItem.id);
  }, [readItems, feedItem.id]);

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

  const handleMouseUp = useCallback(() => {
    if (isPressed) {
      setIsPressed(false);
      setIsAnimating(true);
      setTimeout(() => {
        markAsRead(feedItem.id);
      }, 0);

      const timeout = setTimeout(() => {
        if (feedItem.type === "podcast") {
          setIsPodcastDetailsOpen(true);
        } else {
          setIsReaderViewOpen(true);
        }
        setIsAnimating(false);
      }, transitionDuration);

      animationTimeoutRef.current = timeout;
    }
  }, [feedItem.type, feedItem.id, isPressed, markAsRead]);

  useEffect(() => {
    return () => {
      const timeout = animationTimeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (feedItem.type === "podcast") {
        setTimeout(() => {
          markAsRead(feedItem.id);
        }, 0);

        playAudio({
          id: feedItem.id,
          title: feedItem.title,
          source: feedItem.siteTitle,
          audioUrl: feedItem.enclosures?.[0]?.url || "",
          image: feedItem.favicon || feedItem.thumbnail,
        });
      }
    },
    [feedItem, playAudio, markAsRead]
  );

  /**
   * Handles the click event on the like button.
   *
   * @param {React.MouseEvent} e - The click event.
   */
  const handleLikeClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isTogglingFavorite) return;

      setIsTogglingFavorite(true);

      // Optimistic update
      setLiked((prev) => !prev);

      // TODO: Implement toggleFavorite functionality
      // For now, we'll just simulate a successful toggle
      const result = { success: true, message: "Favorite toggled" };

      if (!result.success) {
        // Revert optimistic update if failed
        setLiked((prev) => !prev);

        toast({
          title: "Error",
          description: result.message || "Failed to update favorite status",
          variant: "destructive",
        });
      }

      setIsTogglingFavorite(false);
    },
    [isTogglingFavorite, toast]
  );

  const formatDate = useCallback((dateString: string) => {
    return dayjs(dateString).fromNow();
  }, []);

  const isCurrentlyPlaying =
    currentAudio && currentAudio.id === feedItem.id && isPlaying;

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleFaviconError = useCallback(() => {
    setFaviconError(true);
  }, []);

  const getShadowStyle = () => {
    if (isPressed) return pressedShadow;
    if (isHovered) return hoverShadow;
    return restShadow;
  };

  useEffect(() => {
    // Check if filter already exists
    if (!document.getElementById("ambilight-filter")) {
      // Create the filter container
      const filterContainer = document.createElement("div");
      filterContainer.className = "filter-container";
      filterContainer.innerHTML = `
        <svg width="0" height="0"><filter id="ambilight" width="300%" height="300%" x="-0.75" y="-0.75" color-interpolation-filters="sRGB"><feOffset in="SourceGraphic" result="source-copy"></feOffset><feColorMatrix in="source-copy" type="saturate" values="1" result="saturated-copy"></feColorMatrix><feColorMatrix in="saturated-copy" type="matrix" values="1 0 0 0 0
                     0 1 0 0 0
                     0 0 1 0 0
                     33 33 33 101 -100" result="bright-colors"></feColorMatrix><feMorphology in="bright-colors" operator="dilate" radius="2" result="spread"></feMorphology><feGaussianBlur in="spread" stdDeviation="11" result="ambilight-light"></feGaussianBlur><feOffset in="SourceGraphic" result="source"></feOffset><feComposite in="source" in2="ambilight-light" operator="over"></feComposite></filter></svg>
      `;
      document.body.appendChild(filterContainer);
    }
  }, []);

  return (
    <>
      <Card
        ref={cardRef}
        style={
          {
            boxShadow: getShadowStyle(),
            transition: "all 150ms ease-out",
            transform: isPressed ? "translateY(2px)" : "none",
            opacity: isRead ? 0.8 : 1,
          } as React.CSSProperties
        }
        className={`card w-full bg-card overflow-hidden cursor-pointer rounded-[40px] relative group ${isRead ? "read-item" : ""
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
          {!imageError && feedItem.thumbnail && (
            <div className="relative w-full p-2">
              <Ambilight 
                className="relative w-full aspect-[16/9] rounded-[32px] overflow-hidden"
                parentHovered={isHovered}
                opacity={{ rest: 0, hover: 0.7 }}
                saturation={1}
                colorCutoff={0}
                spread={2}
                blur={8}
              >
                {imageLoading && (
                  <Skeleton className="absolute inset-0 z-10 rounded-[32px]" />
                )}
                <Image
                  src={feedItem.thumbnail}
                  alt={feedItem.title}
                  height={300}
                  width={300}
                  className={`w-full h-full object-cover rounded-[32px] group-hover:scale-[1.02] transition-all duration-150 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={handleImageError}
                  onLoad={() => setImageLoading(false)}
                  loading="lazy"
                  priority={false}
                />
              </Ambilight>
              {feedItem.type === "podcast" && (
                <Button
                  size="icon"
                  className="absolute bottom-4 right-4 rounded-full"
                  onClick={handlePlayClick}
                >
                  {isCurrentlyPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isCurrentlyPlaying ? "Pause" : "Play"}
                  </span>
                </Button>
              )}
            </div>
          )}

          <CardContent className="p-4">
            <div className="space-y-2">
              <div
                id={`feed-card-header-${feedItem.id}`}
                className="flex flex-wrap items-center justify-between gap-2 font-regular"
              >
                <div className="flex space-between gap-2 align-center items-center ">
                  {!faviconError && feedItem.favicon && (
                    <Image
                      src={feedItem.favicon}
                      alt={`${cleanupTextContent(feedItem.siteTitle)} favicon`}
                      className="w-6 h-6 bg-white rounded-[4px] "
                      height={48}
                      width={48}
                      onError={handleFaviconError}
                      loading="lazy"
                      priority={false}
                    />
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

          <CardFooter
            liked={liked}
            isTogglingFavorite={isTogglingFavorite}
            handleLikeClick={handleLikeClick}
            feedType={feedItem.type}
            duration={feedItem.duration ? feedItem.duration : undefined}
          />
        </div>
      </Card>
      {feedItem.type === "podcast" ? (
        <PodcastDetailsModal
          isOpen={isPodcastDetailsOpen}
          onClose={() => setIsPodcastDetailsOpen(false)}
          podcast={feedItem}
          initialPosition={initialPosition}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => setIsReaderViewOpen(false)}
          feedItem={feedItem}
          initialPosition={initialPosition}
        />
      )}
    </>
  );
});
