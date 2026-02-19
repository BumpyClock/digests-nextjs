"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bookmark, Share2 } from "lucide-react";
import { LayoutGroup, LazyMotion, domAnimation, m } from "motion/react";
import Image from "next/image";
import type React from "react";
import { memo, useCallback, useState } from "react";
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton";
import { Ambilight } from "@/components/ui/ambilight";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter as CardFooterUI } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { useIsInReadLater, useIsItemRead, useReadLaterActions } from "@/hooks/useFeedSelectors";
import { getFeedAnimationIds } from "@/lib/feed-animation-ids";
import { motionTokens } from "@/lib/motion-tokens";
import {
  getViewTransitionStyle,
  runWithViewTransition,
  useViewTransitionsSupported,
} from "@/lib/view-transitions";
import type { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import { handleShare, showReadLaterToast } from "@/utils/content-actions";
import { formatDuration } from "@/utils/formatDuration";
import { cleanupTextContent, getSiteDisplayName } from "@/utils/htmlUtils";
import { canUseImageKit, getImageKitUrl, IMAGE_PRESETS } from "@/utils/imagekit";
import { isValidUrl } from "@/utils/url";

dayjs.extend(relativeTime);

const DEFAULT_THUMBNAIL_COLOR = { r: 0, g: 0, b: 0 };

function formatDate(dateString: string) {
  return dayjs(dateString).fromNow();
}

interface FeedCardProps {
  feed: FeedItem;
  onItemOpen?: (item: FeedItem, cleanup?: () => void) => void;
  onItemOpenTransitionComplete?: () => void;
}

/**
 * CardFooter component for displaying action buttons (play, bookmark, share).
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
        <div className="text-caption text-secondary-content">
          {Number.isFinite(Number(feedItem.duration))
            ? formatDuration(Number(feedItem.duration))
            : feedItem.duration}
        </div>
      )}
    </CardFooterUI>
  );
});

/**
 * FeedCard component for displaying individual feed items.
 */
export const FeedCard = memo(function FeedCard({
  feed: feedItem,
  onItemOpen,
  onItemOpenTransitionComplete,
}: FeedCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const isRead = useIsItemRead(feedItem.id);

  // Animation context
  const { animationEnabled } = useFeedAnimation();
  const vtSupported = useViewTransitionsSupported();
  const animationIds = getFeedAnimationIds(feedItem.id);
  const viewTransitionsEnabled = animationEnabled && vtSupported;
  const motionLayoutEnabled = animationEnabled && !viewTransitionsEnabled;
  const childViewTransitionEnabled = false;

  // CSS custom properties for card shadow color
  const thumbnailColor = feedItem.thumbnailColor || DEFAULT_THUMBNAIL_COLOR;

  const handleCardActivation = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const isShareOrBookmarkButton = target.closest("button");

      if (!isShareOrBookmarkButton) {
        if (isPodcast(feedItem)) {
          onItemOpen?.(feedItem);
        } else {
          if (viewTransitionsEnabled) {
            const sourceTile = (event.currentTarget as HTMLElement).closest(
              "[data-masonic-tile]"
            ) as HTMLElement | null;
            if (sourceTile) {
              sourceTile.classList.add("vt-source-tile");
            }

            runWithViewTransition(
              () => {
                setIsActive(true);
                onItemOpen?.(feedItem, () => setIsActive(false));
              },
              {
                phaseClassName: "reader-vt-active",
                onFinished: () => {
                  if (sourceTile) {
                    sourceTile.classList.remove("vt-source-tile");
                  }
                  onItemOpenTransitionComplete?.();
                },
              }
            );
          } else {
            onItemOpen?.(feedItem);
          }
        }
      }
    },
    [feedItem, viewTransitionsEnabled, onItemOpen, onItemOpenTransitionComplete]
  );

  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        if (event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
        }
        handleCardActivation(event);
      }
    },
    [handleCardActivation]
  );

  const handleImageError = useCallback(() => {
    setImageError(true);
    setShowPlaceholder(true);
  }, []);

  const handleFaviconError = useCallback(() => {
    setFaviconError(true);
  }, []);

  const cardShellMotionStyle = {
    "--card-shadow-r": thumbnailColor.r,
    "--card-shadow-g": thumbnailColor.g,
    "--card-shadow-b": thumbnailColor.b,
    opacity: isRead ? 0.8 : 1,
    // Keep shell transitions enabled only when not currently active.
    ...(getViewTransitionStyle(viewTransitionsEnabled && !isActive, animationIds.cardShell) ?? {}),
  } as React.CSSProperties;

  const cardContentWithShell = (
    <m.div
      whileHover={animationEnabled ? { y: -4 } : undefined}
      whileTap={animationEnabled ? { scale: 0.98 } : undefined}
      initial={animationEnabled ? { opacity: 0, y: 20 } : undefined}
      animate={animationEnabled ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: motionTokens.duration.normal }}
      layoutId={motionLayoutEnabled ? animationIds.cardShell : undefined}
      style={cardShellMotionStyle}
      className={`feed-card card w-full bg-card overflow-hidden cursor-pointer rounded-4xl relative group ${
        isRead ? "read-item" : ""
      }`}
      onClick={handleCardActivation}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div id={`feed-card-image-${feedItem.id}`} className="relative z-10 ">
        {((!imageError && feedItem.thumbnail && isValidUrl(feedItem.thumbnail)) ||
          showPlaceholder) && (
          <m.div
            className="relative w-full p-2"
            layoutId={motionLayoutEnabled ? animationIds.thumbnail : undefined}
            style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.thumbnail)}
          >
            <Ambilight className="relative w-full aspect-video rounded-3xl overflow-hidden">
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
                onLoad={() => setImageLoading(false)}
                onError={handleImageError}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                loading="lazy"
              />
            </Ambilight>
          </m.div>
        )}

        <CardContent className="p-4">
          <div className="space-y-2">
            <div
              id={`feed-card-header-${feedItem.id}`}
              className="flex flex-wrap items-center justify-between gap-2 font-normal"
            >
              <div className="flex space-between gap-2 align-center items-center">
                <div>
                  {!faviconError && feedItem.favicon && isValidUrl(feedItem.favicon) ? (
                    <Image
                      src={feedItem.favicon}
                      alt={`${cleanupTextContent(getSiteDisplayName(feedItem))} favicon`}
                      className="w-6 h-6 bg-background rounded-sm"
                      onError={handleFaviconError}
                      width={24}
                      height={24}
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted rounded-sm flex items-center justify-center text-caption">
                      {cleanupTextContent(getSiteDisplayName(feedItem)).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-caption line-clamp-1">
                  {cleanupTextContent(getSiteDisplayName(feedItem))}
                </div>
              </div>
              <div className="text-caption text-secondary-content w-fit">
                {formatDate(feedItem.published)}
              </div>
            </div>
            <m.h3
              className="text-subtitle"
              layoutId={motionLayoutEnabled ? animationIds.title : undefined}
              style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.title)}
            >
              {cleanupTextContent(feedItem.title)}
            </m.h3>
            {feedItem.author && (
              <div className="text-body-small text-secondary-content">
                By {cleanupTextContent(feedItem.author)}
              </div>
            )}
            <p className="text-body-small text-secondary-content line-clamp-3">
              {cleanupTextContent(feedItem.description)}
            </p>
          </div>
        </CardContent>

        <CardFooter feedItem={feedItem} />
      </div>
    </m.div>
  );

  return (
    <LazyMotion features={domAnimation}>
      {motionLayoutEnabled ? (
        <LayoutGroup id={feedItem.id}>{cardContentWithShell}</LayoutGroup>
      ) : (
        cardContentWithShell
      )}
    </LazyMotion>
  );
});
