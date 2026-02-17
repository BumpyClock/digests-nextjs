"use client";

import { useCallback, useEffect, useRef } from "react";
import { EmptyState } from "@/components/Feed/ArticleReader";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { AdaptiveDetailContainer } from "@/components/Feed/shared/AdaptiveDetailContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReaderView } from "@/hooks/queries";
import { useDelayedMarkAsRead } from "@/hooks/use-delayed-mark-as-read";
import { type FeedItem } from "@/types";
import { useIsMobile } from "@/hooks/use-media-query";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
  onClose?: () => void;
}

const noop = () => {
  // Intentionally empty: close callback is optional for pane mode.
};

export function ReaderViewPane({ feedItem, onClose = noop }: ReaderViewPaneProps) {
  const isMobile = useIsMobile();
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
    <AdaptiveDetailContainer
      isOpen
      onClose={onClose}
      title={feedItem.title}
      itemId={feedItem.id}
      mode="adaptive"
    >
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
          layout={isMobile ? "modal" : "standard"}
        />
      </ScrollArea>
    </AdaptiveDetailContainer>
  );
}
