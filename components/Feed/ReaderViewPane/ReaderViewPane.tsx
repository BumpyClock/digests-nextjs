"use client";

import { useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/Feed/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";
import { useReaderView } from "@/hooks/use-reader-view";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { type FeedItem } from "@/types";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
}

export function ReaderViewPane({ feedItem }: ReaderViewPaneProps) {
  const { markAsRead } = useFeedStore();
  const { readerView, loading, cleanedContent } = useReaderView(feedItem);

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

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <ScrollArea className="h-full w-full" onScroll={handleScroll}>
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
