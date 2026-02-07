"use client";

import { useCallback, useEffect, useRef } from "react";
import { EmptyState } from "@/components/Feed/ArticleReader";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReaderView } from "@/hooks/use-reader-view";
import { useFeedStore } from "@/store/useFeedStore";
import { type FeedItem } from "@/types";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
}

export function ReaderViewPane({ feedItem }: ReaderViewPaneProps) {
  const { markAsRead } = useFeedStore();
  const { readerView, loading, cleanedContent } = useReaderView(feedItem);
  const scrollableNodeRef = useRef<HTMLDivElement>(null);

  // Mark as read after viewing
  useEffect(() => {
    if (feedItem) {
      const timer = setTimeout(() => {
        markAsRead(feedItem.id);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [feedItem, markAsRead]);

  // Mark as read on scroll
  const handleScroll = useCallback(
    (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollTop > 100 && feedItem) {
        markAsRead(feedItem.id);
      }
    },
    [feedItem, markAsRead]
  );

  // Reset scroll position when switching to a different item.
  useEffect(() => {
    if (feedItem?.id && scrollableNodeRef.current) {
      scrollableNodeRef.current.scrollTop = 0;
    }
  }, [feedItem?.id]);

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <ScrollArea
        className="h-full w-full"
        onScroll={handleScroll}
        scrollableNodeRef={scrollableNodeRef}
      >
        <ReaderContent
          feedItem={feedItem}
          readerView={readerView}
          loading={loading}
          cleanedContent={cleanedContent}
          layout="standard"
        />
      </ScrollArea>
    </div>
  );
}
