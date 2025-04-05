"use client";

import { useCallback, useEffect } from "react";
import { ScrollData } from "@/types/reader";
import { Scrollbars } from "react-custom-scrollbars-2";
import { EmptyState } from "@/components/Feed/ArticleReader/ArticleReader";
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
  const handleScroll = useCallback(({ scrollTop }: ScrollData) => {
    if (scrollTop > 100 && feedItem) {
      markAsRead(feedItem.id);
    }
  }, [feedItem, markAsRead]);

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <Scrollbars 
        style={{ width: '100%', height: '100%' }}
        autoHide
        onScrollFrame={handleScroll}
      >
        <ReaderContent
          feedItem={feedItem}
          readerView={readerView}
          loading={loading}
          cleanedContent={cleanedContent}
          layout="standard"
        />
      </Scrollbars>
    </div>
  );
} 