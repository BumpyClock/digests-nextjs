"use client";

import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { Masonry } from "masonic";
import { useQueryClient } from "@tanstack/react-query";
import { FeedCard } from "@/components/Feed/FeedCard/FeedCard";
import { PodcastDetailsModal } from "@/components/Podcast/PodcastDetailsModal";
import { ReaderViewModal } from "@/components/reader-view-modal";
import { useWindowSize } from "@/hooks/use-window-size";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import { useViewTransitionsSupported, runWithViewTransition } from "@/lib/view-transitions";
import { readerViewKeys } from "@/hooks/queries/use-reader-view-query";
import { workerService } from "@/services/worker-service";
import { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import { motion } from "motion/react";
import { getValidReaderViewOrThrow } from "@/hooks/queries/reader-view-validation";

// Custom event for feed refresh
export const FEED_REFRESHED_EVENT = "feed-refreshed";

interface FeedGridProps {
  items: FeedItem[];
  isLoading: boolean;
  skeletonCount?: number;
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
 * Displays a responsive masonry grid of feed items with loading and periodic update checking.
 */
export function FeedGrid({ items, isLoading }: FeedGridProps) {
  const [mounted, setMounted] = useState(false);
  const [openItem, setOpenItem] = useState<FeedItem | null>(null);
  const { width: windowWidth } = useWindowSize();
  const queryClient = useQueryClient();
  const { animationEnabled } = useFeedAnimation();
  const vtSupported = useViewTransitionsSupported();
  const viewTransitionsEnabled = animationEnabled && vtSupported;

  useEffect(() => {
    setMounted(true);
  }, []);

  const columnWidth = 320;
  const columnGutter = 24;
  const columnCount = useMemo(
    () => Math.max(1, Math.floor((windowWidth - 48) / (columnWidth + columnGutter))),
    [windowWidth]
  );

  const cleanupRef = useRef<(() => void) | null>(null);

  const handleItemOpen = useCallback((item: FeedItem, cleanup?: () => void) => {
    cleanupRef.current?.();
    cleanupRef.current = cleanup || null;
    setOpenItem(item);
  }, []);

  const handleClose = useCallback(() => {
    if (viewTransitionsEnabled && openItem && !isPodcast(openItem)) {
      runWithViewTransition(
        () => {
          cleanupRef.current?.();
          cleanupRef.current = null;
          setOpenItem(null);
        },
        { phaseClassName: "reader-vt-active" }
      );
    } else {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setOpenItem(null);
    }
  }, [viewTransitionsEnabled, openItem]);

  const handlePrefetch = useCallback(
    (item: FeedItem) => {
      if (isPodcast(item)) return;
      queryClient.prefetchQuery({
        queryKey: readerViewKeys.byUrl(item.link),
        queryFn: () =>
          workerService
            .fetchReaderView(item.link)
            .then((r) => getValidReaderViewOrThrow(r, item.link)),
        staleTime: 60 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const renderItem = useCallback(
    ({ data: feed }: { data: FeedItem }) => (
      <div style={{ contain: "layout style" }} onMouseEnter={() => handlePrefetch(feed)}>
        <FeedCard feed={feed} onItemOpen={handleItemOpen} />
      </div>
    ),
    [handleItemOpen, handlePrefetch]
  );

  const memoizedItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.warn("Items is not an array:", items);
      return [];
    }
    return items;
  }, [items]);

  const itemKey = useCallback((item: FeedItem, index: number) => {
    if (!item) {
      console.warn(`Undefined item at index ${index}`);
      return `fallback-${index}`;
    }
    return item.id;
  }, []);

  if (!mounted || isLoading || items.length === 0) {
    return <LoadingAnimation />;
  }

  const isOpenItemPodcast = openItem ? isPodcast(openItem) : false;

  try {
    return (
      <>
        <motion.div id="feed-grid" className="pt-6" initial={false} animate={false} layout={false}>
          <Masonry
            items={memoizedItems}
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
          />
        )}
      </>
    );
  } catch (error) {
    console.error("Error rendering FeedGrid:", error);
    return <div>Error loading feed. Please try refreshing the page.</div>;
  }
}
