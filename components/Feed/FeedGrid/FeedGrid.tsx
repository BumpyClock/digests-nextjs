"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Masonry } from "masonic";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import ErrorBoundary from "@/components/error-boundary";
import { FeedCard } from "@/components/Feed/FeedCard/FeedCard";
import { PodcastDetailsModal } from "@/components/Podcast/PodcastDetailsModal";
import { ReaderViewModal } from "@/components/reader-view-modal";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useFeedItemsController } from "@/components/Feed/shared/useFeedItemsController";
import { readerViewQueryByUrl } from "@/hooks/queries";
import { useWindowSize } from "@/hooks/use-window-size";
import { runWithViewTransition, useViewTransitionsSupported } from "@/lib/view-transitions";
import { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";

// Custom event for feed refresh
export const FEED_REFRESHED_EVENT = "feed-refreshed";

interface FeedGridProps {
  items: FeedItem[];
  isLoading: boolean;
  skeletonCount?: number;
  /** Changes when feed/search filter changes — forces Masonry remount to clear stale position cache */
  filterKey?: string;
}

/**
 * Loading animation component displayed while data is being fetched.
 */
const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    </div>
  );
};

/**
 * Empty state component with subtle entrance animation.
 * Shows "All caught up!" message for users with feeds.
 */
const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <CheckCircle
        className="empty-state-enter empty-state-delay-1 h-16 w-16 text-secondary-content"
        style={{ willChange: "transform, opacity" }}
      />
      <h2 className="empty-state-enter empty-state-delay-2 text-title-large text-primary-content">
        All caught up!
      </h2>
      <p className="empty-state-enter empty-state-delay-3 text-body text-secondary-content">
        You've read everything in this view.
      </p>
    </div>
  );
};

/**
 * Displays a responsive masonry grid of feed items with loading and periodic update checking.
 */
export function FeedGrid({ items, isLoading, filterKey }: FeedGridProps) {
  const [mounted, setMounted] = useState(false);
  const [readerTransitionSettled, setReaderTransitionSettled] = useState(false);
  const { width: windowWidth } = useWindowSize();
  const queryClient = useQueryClient();
  const { animationEnabled } = useFeedAnimation();
  const { isScrolling, handleScroll } = useScrollContext();
  const vtSupported = useViewTransitionsSupported();
  const viewTransitionsEnabled = animationEnabled && vtSupported;
  const {
    items: normalizedItems,
    selectedItem: openItem,
    setSelectedItem,
    clearSelection,
  } = useFeedItemsController({ items });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      handleScroll(scrollTop);
    };

    handleWindowScroll();
    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, [handleScroll]);

  const columnWidth = 320;
  const columnGutter = 24;
  const columnCount = useMemo(
    () => Math.max(1, Math.floor((windowWidth - 48) / (columnWidth + columnGutter))),
    [windowWidth]
  );

  // Stores the cleanup callback (e.g. resetting card active state) for the
  // currently open item. On rapid re-opens the previous cleanup runs first,
  // so only one card is ever visually "active" at a time.
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleItemOpen = useCallback(
    (item: FeedItem, cleanup?: () => void) => {
      cleanupRef.current?.();
      cleanupRef.current = cleanup || null;
      setReaderTransitionSettled(!viewTransitionsEnabled);
      setSelectedItem(item);
    },
    [setSelectedItem, viewTransitionsEnabled]
  );

  const handleItemOpenTransitionSettled = useCallback(() => {
    setReaderTransitionSettled(true);
  }, []);

  const handleClose = useCallback(() => {
    if (viewTransitionsEnabled && openItem && !isPodcast(openItem)) {
      runWithViewTransition(
        () => {
          cleanupRef.current?.();
          cleanupRef.current = null;
          clearSelection();
        },
        { phaseClassName: "reader-vt-active" }
      );
    } else {
      cleanupRef.current?.();
      cleanupRef.current = null;
      clearSelection();
    }
  }, [viewTransitionsEnabled, openItem, clearSelection]);

  const handlePrefetch = useCallback(
    (item: FeedItem) => {
      if (isPodcast(item)) return;
      const options = readerViewQueryByUrl(item.link);
      const state = queryClient.getQueryState(options.queryKey);
      // Skip if data is already fresh or a fetch is in progress
      if (state?.status === "success" && state.dataUpdatedAt > Date.now() - 60 * 60 * 1000) return;
      if (state?.fetchStatus === "fetching") return;
      queryClient.prefetchQuery(options);
    },
    [queryClient]
  );

  const renderItem = useCallback(
    ({ data: feed }: { data: FeedItem }) => (
      // biome-ignore lint/a11y/noStaticElementInteractions: prefetch-only hover, not interactive
      <div
        role="presentation"
        className="relative z-0 hover:z-modal focus-within:z-modal"
        style={{ contain: "layout style" }}
        onMouseEnter={() => handlePrefetch(feed)}
      >
        <FeedCard
          feed={feed}
          onItemOpen={handleItemOpen}
          onItemOpenTransitionComplete={
            viewTransitionsEnabled ? handleItemOpenTransitionSettled : undefined
          }
        />
      </div>
    ),
    [handleItemOpen, handlePrefetch, viewTransitionsEnabled, handleItemOpenTransitionSettled]
  );

  const itemKey = useCallback((item: FeedItem) => item.id, []);

  if (!mounted || isLoading) {
    return <LoadingAnimation />;
  }

  if (normalizedItems.length === 0) {
    return <EmptyState />;
  }

  const isOpenItemPodcast = openItem ? isPodcast(openItem) : false;

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-[50vh] text-sm text-muted">
          Error loading feed. Please try refreshing the page.
        </div>
      }
    >
      <motion.div
        id="feed-grid"
        className={`pt-6 ${isScrolling ? "is-scrolling" : ""}`}
        initial={false}
        animate={false}
        layout={false}
      >
        <Masonry
          key={filterKey ?? "default"}
          items={normalizedItems}
          maxColumnCount={columnCount}
          columnGutter={columnGutter}
          columnWidth={columnWidth}
          render={renderItem}
          overscanBy={2}
          itemKey={itemKey}
        />
      </motion.div>

      {openItem && isOpenItemPodcast && (
        <PodcastDetailsModal isOpen={true} onClose={handleClose} podcast={openItem} />
      )}

      {openItem && !isOpenItemPodcast && (
        <ReaderViewModal
          isOpen={true}
          onClose={handleClose}
          feedItem={openItem}
          useViewTransition={viewTransitionsEnabled}
          viewTransitionBackdropSettled={readerTransitionSettled}
        />
      )}
    </ErrorBoundary>
  );
}
