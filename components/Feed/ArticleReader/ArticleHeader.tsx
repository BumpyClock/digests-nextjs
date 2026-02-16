"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { Ambilight } from "@/components/ui/ambilight";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { getFeedAnimationIds } from "@/lib/feed-animation-ids";
import { motionTokens } from "@/lib/motion-tokens";
import { getViewTransitionStyle, useViewTransitionsSupported } from "@/lib/view-transitions";
import type { FeedItem, ReaderViewResponse } from "@/types";
import { getSiteDisplayName } from "@/utils/htmlUtils";
import { SiteFavicon } from "./SiteFavicon";

interface ArticleHeaderProps {
  feedItem: FeedItem;
  readerView: ReaderViewResponse | null;
  parallaxOffset?: number;
  showThumbnail?: boolean;
  layout?: "standard" | "compact" | "modal";
  actions?: React.ReactNode;
  className?: string;
  loading?: boolean;
  extractedAuthor?: { name: string; image?: string };
  disableTransitionEffectsDuringWindow?: boolean;
  disableEntranceAnimations?: boolean;
}

/**
 * Article header component with thumbnail and metadata
 * Simplified to focus on presentation, actions handled by ArticleActions
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleHeader = memo<ArticleHeaderProps>(
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
    disableTransitionEffectsDuringWindow = false,
    disableEntranceAnimations = false,
  }) => {
    const isModal = layout === "modal";
    const isCompact = layout === "compact";
    const [imageLoaded, setImageLoaded] = useState(false);
    const [ambilightReady, setAmbilightReady] = useState(!isModal);
    const [isTransitionWindow, setIsTransitionWindow] = useState(false);
    const { animationEnabled } = useFeedAnimation();
    const animationIds = getFeedAnimationIds(feedItem.id);
    const modalTitle = readerView?.title || feedItem.title;
    const vtSupported = useViewTransitionsSupported();
    const viewTransitionsEnabled = animationEnabled && isModal && vtSupported;
    const motionLayoutEnabled = animationEnabled && isModal && !viewTransitionsEnabled;
    const childViewTransitionEnabled = false;
    const disableHeavyEffects = disableTransitionEffectsDuringWindow && isTransitionWindow;
    const disableMountAnimations = disableEntranceAnimations && isModal;
    const disableImageFadeIn = disableMountAnimations || disableHeavyEffects;

    // Defer ambilight activation in modal to avoid expensive paint during entrance
    useEffect(() => {
      if (!isModal) return;
      const t = setTimeout(() => setAmbilightReady(true), 350);
      return () => clearTimeout(t);
    }, [isModal]);

    useEffect(() => {
      if (!isModal || !disableTransitionEffectsDuringWindow) {
        setIsTransitionWindow(false);
        return;
      }

      setIsTransitionWindow(true);
      const t = setTimeout(() => setIsTransitionWindow(false), 450);
      return () => clearTimeout(t);
    }, [isModal, disableTransitionEffectsDuringWindow]);

    return (
      <>
        {/* Thumbnail Section */}
        {showThumbnail && (
          <div className="mb-6">
            <div
              className={`overflow-hidden relative ${
                isModal ? "rounded-2xl max-h-[450px]" : "rounded-lg mt-4"
              }`}
            >
              {loading && !isModal ? (
                // Show skeleton when loading
                <Skeleton
                  className={`w-full ${isModal ? "h-[450px]" : "h-[200px] md:h-[250px]"}`}
                />
              ) : feedItem.thumbnail && feedItem.thumbnail.trim() !== "" ? (
                <motion.div
                  layoutId={motionLayoutEnabled ? animationIds.thumbnail : undefined}
                  style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.thumbnail)}
                >
                  {/* Skeleton placeholder - positioned behind image */}
                  <AnimatePresence>
                    {!imageLoaded && (
                      <motion.div
                        initial={disableMountAnimations ? false : { opacity: 1 }}
                        exit={disableMountAnimations ? undefined : { opacity: 0 }}
                        transition={
                          disableMountAnimations
                            ? { duration: 0 }
                            : { duration: motionTokens.duration.slow }
                        }
                        className="absolute inset-0 z-10"
                      >
                        <Skeleton className="w-full h-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actual image with Ambilight - always in position */}
                  <Ambilight
                    className="w-full h-full"
                    isActive={ambilightReady && !disableHeavyEffects}
                    opacity={{ rest: 0.5, hover: 0.7 }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: motion.img keeps animation + layout control here */}
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
                      initial={disableImageFadeIn ? false : { opacity: 0 }}
                      animate={disableImageFadeIn ? undefined : { opacity: imageLoaded ? 1 : 0 }}
                      transition={
                        disableImageFadeIn ? undefined : { duration: motionTokens.duration.slow }
                      }
                    />
                  </Ambilight>
                </motion.div>
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
                    initial={disableMountAnimations ? false : { opacity: 0 }}
                    animate={disableMountAnimations ? undefined : { opacity: 1 }}
                    transition={
                      disableMountAnimations
                        ? { duration: 0 }
                        : { duration: motionTokens.duration.slow }
                    }
                    className="text-fluid-xl font-bold mb-2 text-left leading-fluid-tight"
                  >
                    {readerView.title}
                  </motion.h1>
                )
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-fluid-sm text-secondary-content flex-1 min-w-0">
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
                          siteTitle={getSiteDisplayName(feedItem)}
                          size="small"
                          priority={isModal}
                        />
                      )}
                      <span className="truncate block" title={getSiteDisplayName(feedItem)}>
                        {getSiteDisplayName(feedItem)}
                      </span>

                      {/* Vertical Divider */}
                      {extractedAuthor && <div className="w-px h-5 bg-border mx-1" />}

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
                          <span className="text-fluid-xs font-medium text-primary-content truncate">
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
                    initial={disableMountAnimations ? false : { opacity: 0 }}
                    animate={disableMountAnimations ? undefined : { opacity: 1 }}
                    transition={
                      disableMountAnimations
                        ? { duration: 0 }
                        : {
                            duration: motionTokens.duration.slow,
                            delay: motionTokens.duration.fast,
                          }
                    }
                  >
                    {actions}
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 text-fluid-sm text-secondary-content flex-1 min-w-0">
                  {loading && !isModal ? (
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
                      <div className="flex items-center gap-2 min-w-0">
                        <div>
                          {feedItem.favicon ? (
                            <SiteFavicon
                              favicon={feedItem.favicon}
                              siteTitle={getSiteDisplayName(feedItem)}
                              size={isModal ? "medium" : "small"}
                              priority={isModal}
                            />
                          ) : null}
                        </div>
                        <span className="truncate block" title={getSiteDisplayName(feedItem)}>
                          {getSiteDisplayName(feedItem)}
                        </span>
                      </div>

                      {/* Vertical Divider */}
                      {extractedAuthor && <div className="w-px h-6 bg-border mx-2" />}

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
                          <span className="text-fluid-sm font-medium text-primary-content truncate">
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
                  <motion.div
                    initial={disableMountAnimations ? false : { opacity: 0 }}
                    animate={disableMountAnimations ? undefined : { opacity: 1 }}
                    transition={
                      disableMountAnimations
                        ? { duration: 0 }
                        : {
                            duration: motionTokens.duration.slow,
                            delay: motionTokens.duration.fast,
                          }
                    }
                    className="flex gap-2"
                  >
                    {actions}
                  </motion.div>
                )}
              </div>

              {/* Title */}
              {loading && !isModal ? (
                <div className="mb-4">
                  <Skeleton className={`h-8 w-full mb-2 ${isModal ? "md:h-10" : ""}`} />
                  <Skeleton className={`h-8 w-3/4 ${isModal ? "md:h-10" : ""}`} />
                </div>
              ) : (
                modalTitle && (
                  <motion.h1
                    initial={disableMountAnimations ? false : { opacity: 0, y: 10 }}
                    animate={disableMountAnimations ? undefined : { opacity: 1, y: 0 }}
                    transition={
                      disableMountAnimations
                        ? { duration: 0 }
                        : {
                            duration: motionTokens.duration.slow,
                            delay: motionTokens.duration.fast,
                          }
                    }
                    layoutId={motionLayoutEnabled ? animationIds.title : undefined}
                    style={getViewTransitionStyle(childViewTransitionEnabled, animationIds.title)}
                    className={
                      isModal
                        ? "text-fluid-3xl font-bold mb-2 text-left leading-fluid-tight"
                        : "text-fluid-2xl font-bold mb-3 text-left leading-fluid-tight"
                    }
                    id={isModal ? "reader-view-title" : undefined}
                  >
                    {modalTitle}
                  </motion.h1>
                )
              )}
            </>
          )}
        </div>
      </>
    );
  }
);

ArticleHeader.displayName = "ArticleHeader";
