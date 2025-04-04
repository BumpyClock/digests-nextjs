"use client";

import { memo, useCallback, useMemo } from "react";
import { FeedItem } from "@/types";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useFeedStore } from "@/store/useFeedStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { cleanupTextContent } from "@/utils/htmlUtils";
dayjs.extend(relativeTime);

interface FeedListProps {
  items: FeedItem[];
  isLoading: boolean;
  selectedItem?: FeedItem | null;
  onItemSelect: (item: FeedItem) => void;
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

  return (
    <div
      className={`p-4 border-b cursor-pointer transition-colors flex gap-3 ${
        isSelected
          ? "bg-primary/10 border-l-4 border-l-primary"
          : "hover:bg-secondary/20"
      } ${isRead ? "opacity-70" : ""}`}
      onClick={onSelect}
    >
      {item.thumbnail && (
        <div className="flex-shrink-0">
          <Image
            src={item.thumbnail}
            alt={cleanupTextContent(item.title)}
            width={70}
            height={70}
            className="rounded-md object-cover h-[70px] w-[70px]"
          />
        </div>
      )}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.favicon && (
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
        <h3 className="font-semibold text-sm line-clamp-2 mb-1">{cleanupTextContent(item.title)}</h3>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {item.favorite && <Heart className="h-3 w-3 fill-red-500 text-red-500" />}
        </div>
      </div>
    </div>
  );
});

export function FeedList({
  items,
  isLoading,
  selectedItem,
  onItemSelect,
}: FeedListProps) {
  const { readItems } = useFeedStore();

  const isItemRead = useCallback(
    (id: string) => {
      if (!readItems || !(readItems instanceof Set)) return false;
      return readItems.has(id);
    },
    [readItems]
  );

  const renderSkeletons = useCallback(() => {
    return Array(10)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="p-4 border-b animate-pulse">
          <div className="flex gap-3">
            <div className="bg-secondary h-[70px] w-[70px] rounded-md"></div>
            <div className="flex-grow">
              <div className="h-2 bg-secondary rounded w-16 mb-2"></div>
              <div className="h-4 bg-secondary rounded w-full mb-2"></div>
              <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-secondary rounded w-20 mt-2"></div>
            </div>
          </div>
        </div>
      ));
  }, []);

  if (isLoading) {
    return (
      <div className="border rounded-md overflow-hidden h-full">
        <Scrollbars autoHide style={{ height: "100%" }}>
          {renderSkeletons()}
        </Scrollbars>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="border rounded-md p-8 flex items-center justify-center h-full">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden h-full">
      <Scrollbars autoHide style={{ height: "100%" }}>
        {items.map((item) => (
          <FeedListItem
            key={item.id}
            item={item}
            isSelected={selectedItem?.id === item.id}
            onSelect={() => onItemSelect(item)}
            isRead={isItemRead(item.id)}
          />
        ))}
      </Scrollbars>
    </div>
  );
} 