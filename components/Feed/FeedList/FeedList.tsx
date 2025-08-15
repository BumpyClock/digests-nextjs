"use client";

import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import { FeedItem } from "@/types";
import Image from "next/image";
import { Heart } from "lucide-react";
import { ScrollArea, useScrollAreaRef } from "@/components/ui/scroll-area";
import { useIsItemRead } from "@/hooks/useFeedActions";
import { useFeedContext, useFeedSelection, useFeedLoading, useFeedNavigation } from "@/contexts/FeedContext";
import { LoadingStateGuard, LoadingSkeleton } from "@/components/ui/loading-states";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { cleanupTextContent } from "@/utils/htmlUtils";
dayjs.extend(relativeTime);

interface FeedListProps {
  // No props needed - uses context
}

const FeedListItem = memo(function FeedListItem({
  item,
  isSelected,
  onSelect,
}: {
  item: FeedItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isRead = useIsItemRead(item.id);
  const formattedDate = useMemo(() => {
    return item.published ? dayjs(item.published).fromNow() : "Date unknown";
  }, [item.published]);

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div
      className={`p-4 border-b cursor-pointer transition-colors flex gap-3 ${
        isSelected
          ? "bg-primary/10 border-l-4 border-l-primary"
          : "hover:bg-secondary/20"
      } ${isRead ? "opacity-70" : ""}`}
      onClick={onSelect}
    >
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
      <div className="grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.favicon && isValidUrl(item.favicon) && (
            <Image
              src={item.favicon}
              alt={cleanupTextContent(item.siteTitle)}
              width={16}
              height={16}
              className="rounded w-4 h-4"
            />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {cleanupTextContent(item.siteTitle)}
          </span>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 mb-1">
          {cleanupTextContent(item.title)}
        </h3>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {item.favorite && (
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
});

export function FeedList({}: FeedListProps) {
  const { items, selectedItem, handleItemSelect } = useFeedContext();
  const { loadingState } = useFeedLoading();
  const { scrollPosition } = useFeedNavigation();
  const scrollbarsRef = useScrollAreaRef();
  const scrollableNodeRef = useRef<HTMLDivElement>(null);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);

  // Restore scroll position when component remounts
  useEffect(() => {
    if (scrollableNodeRef.current && scrollPosition > 0) {
      scrollableNodeRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setCurrentScrollTop(target.scrollTop);
  }, []);

  const handleItemClick = useCallback(
    (item: FeedItem) => {
      handleItemSelect(item, currentScrollTop);
    },
    [handleItemSelect, currentScrollTop],
  );

  // Memoize the item selection handlers to prevent re-renders
  const itemSelectHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>();
    items.forEach((item) => {
      handlers.set(item.id, () => handleItemClick(item));
    });
    return handlers;
  }, [items, handleItemClick]);

  const renderSkeletons = useCallback(() => {
    return Array(10)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="p-4 border-b">
          <LoadingSkeleton lines={2} showAvatar className="flex gap-3" />
        </div>
      ));
  }, []);

  return (
    <div className="border rounded-md overflow-hidden h-full">
      <LoadingStateGuard 
        loadingState={loadingState}
        fallback={{
          loading: (
            <ScrollArea variant="list" className="h-full">
              {renderSkeletons()}
            </ScrollArea>
          ),
          refreshing: (
            <ScrollArea variant="list" className="h-full">
              {items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="opacity-50">
                    <FeedListItem
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={itemSelectHandlers.get(item.id)!}
                    />
                  </div>
                ))
              ) : (
                renderSkeletons()
              )}
            </ScrollArea>
          ),
          initializing: (
            <ScrollArea variant="list" className="h-full">
              {renderSkeletons()}
            </ScrollArea>
          ),
          error: (
            <div className="p-8 flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to load items. Please try refreshing.</p>
            </div>
          ),
        }}
      >
        {(!items || items.length === 0) ? (
          <div className="p-8 flex items-center justify-center h-full">
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <ScrollArea
            ref={scrollbarsRef}
            variant="list"
            className="h-full"
            onScroll={handleScroll}
            scrollableNodeRef={scrollableNodeRef}
          >
            {items.map((item) => (
              <FeedListItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onSelect={itemSelectHandlers.get(item.id)!}
              />
            ))}
          </ScrollArea>
        )}
      </LoadingStateGuard>
    </div>
  );
}

FeedList.displayName = "FeedList";
