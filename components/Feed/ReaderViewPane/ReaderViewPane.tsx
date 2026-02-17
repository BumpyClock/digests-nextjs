"use client";

import { useCallback, useEffect, useRef } from "react";
import { EmptyState } from "@/components/Feed/ArticleReader";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { DetailPaneShell } from "@/components/Feed/shared/DetailPaneShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReaderView } from "@/hooks/queries";
import { useDelayedMarkAsRead } from "@/hooks/use-delayed-mark-as-read";
import { type FeedItem } from "@/types";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
}

export function ReaderViewPane({ feedItem }: ReaderViewPaneProps) {
  const { markNow } = useDelayedMarkAsRead(feedItem?.id, Boolean(feedItem), 2000);
  const { readerView, loading, cleanedContent } = useReaderView(feedItem?.link || "");
  const scrollableNodeRef = useRef<HTMLDivElement>(null);

  // Mark as read on scroll
  const handleScroll = useCallback(
    (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollTop > 100 && feedItem) {
        markNow();
      }
    },
    [feedItem, markNow]
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
    <DetailPaneShell>
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
    </DetailPaneShell>
  );
}
