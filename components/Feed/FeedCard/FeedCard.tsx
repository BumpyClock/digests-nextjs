"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bookmark, Podcast, Rss, Share2 } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Image from "next/image";
import type React from "react";
import { memo, useCallback, useState } from "react";
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton";
import { Ambilight } from "@/components/ui/ambilight";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter as CardFooterUI } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useIsItemRead } from "@/hooks/useFeedSelectors";
import { getFeedAnimationIds } from "@/lib/feed-animation-ids";
import { motionTokens } from "@/lib/motion-tokens";
import {
  getViewTransitionStyle,
  runWithViewTransition,
  useViewTransitionsSupported,
} from "@/lib/view-transitions";
import type { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import { formatDuration } from "@/utils/formatDuration";
import { cleanupTextContent } from "@/utils/html";
import { canUseImageKit, getImageKitUrl, IMAGE_PRESETS } from "@/utils/images/imagekit";
import { isValidUrl } from "@/utils/url";
import { useContentActions } from "@/hooks/use-content-actions";
import { FeedCardBase } from "@/components/Feed/shared/FeedCardBase";
import { getSiteDisplayName } from "@/utils/html";

dayjs.extend(relativeTime);

const DEFAULT_THUMBNAIL_COLOR = { r: 0, g: 0, b: 0 };

function formatDate(dateString: string) {
  return dayjs(dateString).fromNow();
}

export interface FeedCardProps {
  feed: FeedItem;
  onItemOpen?: (item: FeedItem, cleanup?: () => void) => void;
  onItemOpenTransitionComplete?: () => void;
}

/**
 * CardFooter component for displaying action buttons (play, bookmark, share).
 */
const CardFooter = memo(function CardFooter({ feedItem }: { feedItem: FeedItem }) {
  const contentType = isPodcast(feedItem) ? "podcast" : "article";
  const { isInReadLater, toggleReadLater, handleShare } = useContentActions({
    contentType,
    itemId: feedItem.id,
  });

  const onShare = () => handleShare(feedItem.link, feedItem.title, feedItem.description);
  const onReadLater = () => toggleReadLater();

  return (
    <CardFooterUI className="p-4 pt-0 flex justify-between">
      <div className="flex space-x-2">
        {isPodcast(feedItem) && (
          <PodcastPlayButton podcast={feedItem} variant="ghost" size="icon" className="h-8 w-8" />
        )}

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReadLater}>
          <Bookmark className={`h-4 w-4 ${isInReadLater ? "fill-red-500 text-red-500" : ""}`} />
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
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const isRead = useIsItemRead(feedItem.id);

  // Animation context
  const { animationEnabled } = useFeedAnimation();
  const { isScrolling } = useScrollContext();
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
    setImageLoading(false);
  }, []);

  const cardShellMotionStyle = {
    "--card-shadow-r": thumbnailColor.r,
    "--card-shadow-g": thumbnailColor.g,
    "--card-shadow-b": thumbnailColor.b,
    opacity: isRead ? 0.8 : 1,
    // Keep shell transitions enabled only when not currently active.
    ...(getViewTransitionStyle(viewTransitionsEnabled && !isActive, animationIds.cardShell) ?? {}),
  } as React.CSSProperties;

  const interactionMotionEnabled = animationEnabled && !isScrolling;
  const PlaceholderIcon = isPodcast(feedItem) ? Podcast : Rss;
  const siteName = getSiteDisplayName(feedItem);

  const cardContentWithShell = (
    <motion.div
      whileHover={interactionMotionEnabled ? { y: -4 } : undefined}
      whileTap={interactionMotionEnabled ? { scale: 0.98 } : undefined}
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
          <motion.div
            className="relative w-full p-2"
            layoutId={motionLayoutEnabled ? animationIds.thumbnail : undefined}
            style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.thumbnail)}
          >
            <Ambilight
              className="relative w-full aspect-video rounded-3xl overflow-hidden"
              suppressHover={isScrolling}
            >
              {!showPlaceholder && imageLoading && (
                <Skeleton className="absolute inset-0 z-10 rounded-3xl" />
              )}
              {showPlaceholder ? (
                <div className="flex h-full w-full items-center justify-center rounded-3xl bg-muted text-secondary-content">
                  <PlaceholderIcon size={64} aria-hidden="true" />
                </div>
              ) : (
                <Image
                  src={
                    canUseImageKit(feedItem.thumbnail)
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
              )}
            </Ambilight>
          </motion.div>
        )}

        <CardContent className="p-4">
          <div className="space-y-2">
            <FeedCardBase
              title={feedItem.title}
              headline={siteName}
              item={feedItem}
              iconUrl={feedItem.favicon}
              iconAlt={`${siteName} favicon`}
              iconSize={24}
              iconFallback={
                <div
                  className="rounded-sm bg-muted flex items-center justify-center text-caption"
                  style={{ width: 24, height: 24 }}
                >
                  <PlaceholderIcon size={16} aria-hidden="true" />
                </div>
              }
              headerClassName="flex items-center gap-2 min-w-0"
              subtitle={formatDate(feedItem.published)}
              subtitleClassName="text-caption text-secondary-content"
              className="space-y-2"
              titleContent={
                <motion.h3
                  className="text-subtitle"
                  layoutId={motionLayoutEnabled ? animationIds.title : undefined}
                  style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.title)}
                >
                  {cleanupTextContent(feedItem.title)}
                </motion.h3>
              }
            >
              {feedItem.author ? (
                <div className="text-body-small text-secondary-content">
                  By {cleanupTextContent(feedItem.author)}
                </div>
              ) : null}
              <p className="text-body-small text-secondary-content line-clamp-3">
                {cleanupTextContent(feedItem.description)}
              </p>
            </FeedCardBase>
          </div>
        </CardContent>

        <CardFooter feedItem={feedItem} />
      </div>
    </motion.div>
  );

  return motionLayoutEnabled ? (
    <LayoutGroup id={feedItem.id}>{cardContentWithShell}</LayoutGroup>
  ) : (
    cardContentWithShell
  );
});

