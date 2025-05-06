"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollData } from "@/types/reader";
import { Scrollbars } from "react-custom-scrollbars-2";
import { EmptyState } from "@/components/Feed/ArticleReader/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";
import { useReaderView } from "@/hooks/use-reader-view";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { ScrollShadow } from "@/components/ui/scroll-shadow";
import { type FeedItem } from "@/types";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
}

export function ReaderViewPane({ feedItem }: ReaderViewPaneProps) {
  const { markAsRead } = useFeedStore();
  const { readerView, loading, cleanedContent } = useReaderView(feedItem);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(true);
  
  // Mark as read after viewing
  useEffect(() => {
    if (feedItem) {
      const timer = setTimeout(() => {
        markAsRead(feedItem.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [feedItem, markAsRead]);

  // Handle scroll events for both read tracking and scroll shadows
  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: ScrollData) => {
    // Mark as read on scroll
    if (scrollTop > 100 && feedItem) {
      markAsRead(feedItem.id);
    }
    
    // Fallback for browsers without scroll-timeline support
    setShowTopShadow(scrollTop > 10);
    setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 10);
  }, [feedItem, markAsRead]);

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card relative">
      {/* Scroll indicators with fallback support */}
      <ScrollShadow position="top" visible={showTopShadow} />
      
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
      
      <ScrollShadow position="bottom" visible={showBottomShadow} />
    </div>
  );
} 