"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Heart } from "lucide-react";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFeedStore } from "@/store/useFeedStore";
import type { FeedItem } from "@/types";
import { cleanupTextContent, getSiteDisplayName } from "@/utils/htmlUtils";
import { isValidUrl } from "@/utils/url";

dayjs.extend(relativeTime);

interface FeedListProps {
  items: FeedItem[];
  isLoading: boolean;
  selectedItem?: FeedItem | null;
  onItemSelect: (item: FeedItem, scrollTop: number) => void;
  savedScrollPosition?: number;
}

const FeedListItem = memo(function FeedListItem({
  item,
  isSelected,
  onSelect,
  isRead,
}: {
  item: FeedItem;
  isSelected: boolean;
  onSelect: () => void;
  isRead: boolean;
}) {
  const formattedDate = useMemo(() => {
    return item.published ? dayjs(item.published).fromNow() : "Date unknown";
  }, [item.published]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  return (
    <button
      type="button"
      className={`p-4 border-b cursor-pointer transition-colors flex gap-3 text-left w-full ${
        isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-secondary/20"
      } ${isRead ? "opacity-70" : ""}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.favicon && isValidUrl(item.favicon) && (
            <Image
              src={item.favicon}
              alt={cleanupTextContent(getSiteDisplayName(item))}
              width={16}
              height={16}
              className="rounded w-4 h-4"
            />
          )}
          <span className="text-caption text-secondary-content truncate">
            {cleanupTextContent(getSiteDisplayName(item))}
          </span>
        </div>
        <h3 className="text-subtitle line-clamp-2 mb-1">
          {cleanupTextContent(item.title)}
        </h3>
        <div className="flex justify-between items-center text-caption text-secondary-content">
          <span>{formattedDate}</span>
          {item.favorite && <Heart className="h-3 w-3 fill-red-500 text-red-500" />}
        </div>
      </div>
      {item.thumbnail && isValidUrl(item.thumbnail) && (
        <div className="shrink-0">
          <Image
            src={item.thumbnail}
            alt={cleanupTextContent(item.title)}
            width={70}
            height={70}
            className="rounded-md object-cover h-[70px] w-[70px]"
          />
        </div>
      )}
    </button>
  );
});

export function FeedList({
  items,
  isLoading,
  selectedItem,
  onItemSelect,
  savedScrollPosition = 0,
}: FeedListProps) {
  const scrollableNodeRef = useRef<HTMLDivElement>(null);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);
  const readItems = useFeedStore((state) => state.readItems);

  const readItemsSet = useMemo(() => {
    if (readItems instanceof Set) {
      return readItems;
    }

    return new Set(Array.isArray(readItems) ? readItems : []);
  }, [readItems]);

  // Restore scroll position when component remounts
  useEffect(() => {
    if (scrollableNodeRef.current && savedScrollPosition > 0) {
      scrollableNodeRef.current.scrollTop = savedScrollPosition;
    }
  }, [savedScrollPosition]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollableNodeRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setCurrentScrollTop(target.scrollTop);
  }, []);

  const handleItemSelect = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) {
        return;
      }

      onItemSelect(item, currentScrollTop);
    },
    [items, currentScrollTop, onItemSelect]
  );

  const skeletonKeys = useMemo(() => Array.from({ length: 10 }, (_, i) => `skeleton-${i}`), []);

  const renderSkeletons = useCallback(() => {
    return skeletonKeys.map((key) => (
      <div key={key} className="p-4 border-b animate-pulse">
        <div className="flex gap-3">
          <div className="bg-secondary h-[70px] w-[70px] rounded-md"></div>
          <div className="grow">
            <div className="h-2 bg-secondary rounded w-16 mb-2"></div>
            <div className="h-4 bg-secondary rounded w-full mb-2"></div>
            <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-secondary rounded w-20 mt-2"></div>
          </div>
        </div>
      </div>
    ));
  }, [skeletonKeys]);

  if (isLoading) {
    return (
      <div className="border rounded-md overflow-hidden h-full">
        <ScrollArea variant="list" className="h-full">
          {renderSkeletons()}
        </ScrollArea>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="border rounded-md p-8 flex items-center justify-center h-full">
        <p className="text-secondary-content">No items found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden h-full">
      <ScrollArea
        variant="list"
        className="h-full"
        onScroll={handleScroll}
        scrollableNodeRef={scrollableNodeRef}
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index];
            if (!item) {
              return null;
            }

            return (
              <div
                key={item.id}
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                }}
              >
                <FeedListItem
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  isRead={readItemsSet.has(item.id)}
                  onSelect={() => handleItemSelect(virtualItem.index)}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
