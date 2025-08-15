"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { Masonry } from "masonic";
import { FeedCard } from "@/components/Feed/FeedCard/FeedCard";
import { useWindowSize } from "@/hooks/use-window-size";
import { FeedItem } from "@/types";
import { motion } from "motion/react";

// Custom event for feed refresh
export const FEED_REFRESHED_EVENT = "feed-refreshed";

interface FeedGridProps {
  items: FeedItem[];
  isLoading: boolean;
  skeletonCount?: number;
}

/**
 * CSS-based loading animation (replaces 268KB Lottie animation for 4x smaller bundle)
 */
const LoadingAnimation = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Modern CSS loading animation - RSS feed theme */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          
          {/* Inner pulsing dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
          </div>
          
          {/* RSS feed icon overlay */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="text-primary/60 text-lg">📡</div>
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="absolute bottom-16 text-center">
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading feeds...
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Displays a responsive masonry grid of feed items with loading and periodic update checking.
 *
 * Shows a loading animation until the component is mounted, a minimum loading time has elapsed, and items are available. Periodically checks for new feed items and notifies the user with a toast if updates are found, allowing manual refresh.
 *
 * @param items - The array of feed items to display.
 * @param isLoading - Whether the feed is currently loading.
 *
 * @returns The rendered feed grid or a loading animation.
 *
 * @remark If new items are detected during periodic checks, a toast notification is shown with an option to refresh the feed.
 */
export function FeedGrid({ items, isLoading }: FeedGridProps) {
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();
  const [isMinLoadingComplete, setIsMinLoadingComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsMinLoadingComplete(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Background sync is now handled by the main page component using React Query
  // This simplifies the FeedGrid component to focus only on rendering

  const columnWidth = 320;
  const columnGutter = 24;
  const columnCount = useMemo(
    () =>
      Math.max(
        1,
        Math.floor((windowWidth - 48) / (columnWidth + columnGutter)),
      ),
    [windowWidth],
  );

  const renderItem = useCallback(
    ({ data: feed }: { data: FeedItem }) => (
      <div style={{ contain: "layout style" }}>
        <FeedCard feed={feed} />
      </div>
    ),
    [],
  );

  const memoizedItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.warn("Items is not an array:", items);
      return [];
    }
    return items.filter((item) => item && item.id);
  }, [items]);

  const cacheKey = useMemo(
    () => `masonry-${memoizedItems.length}`,
    [memoizedItems.length],
  );

  const itemKey = useCallback((item: FeedItem, index: number) => {
    if (!item) {
      console.warn(`Undefined item at index ${index}`);
      return `fallback-${index}`;
    }
    return item.id;
  }, []);

  if (!mounted || !isMinLoadingComplete || isLoading || items.length === 0) {
    return <LoadingAnimation />;
  }

  try {
    return (
      <motion.div
        id="feed-grid"
        className="pt-6 h-screen"
        initial={false}
        animate={false}
        layout={false}
      >
        <Masonry
          key={cacheKey}
          items={memoizedItems}
          maxColumnCount={columnCount}
          columnGutter={columnGutter}
          columnWidth={columnWidth}
          render={renderItem}
          overscanBy={2}
          itemKey={itemKey}
        />
      </motion.div>
    );
  } catch (error) {
    console.error("Error rendering FeedGrid:", error);
    return <div>Error loading feed. Please try refreshing the page.</div>;
  }
}
