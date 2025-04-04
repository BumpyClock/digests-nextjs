"use client";

import { useState, useEffect, useCallback } from "react";
import { type FeedItem, type ReaderViewResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Scrollbars } from "react-custom-scrollbars-2";
import { workerService } from "@/services/worker-service";
import { 
  ArticleHeader, 
  ArticleContent, 
  LoadingSkeleton, 
  EmptyState,
  processArticleContent
} from "@/components/Feed/ArticleReader/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";

interface ReaderViewPaneProps {
  feedItem: FeedItem | null;
}

export function ReaderViewPane({ feedItem }: ReaderViewPaneProps) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const { toast } = useToast();
  const { markAsRead } = useFeedStore();

  const cleanedContent = processArticleContent(readerView);

  const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
    setScrollTop(scrollTop);
    
    // Mark as read when scrolled down a bit
    if (scrollTop > 100 && feedItem) {
      markAsRead(feedItem.id);
    }
  }, [feedItem, markAsRead]);

  useEffect(() => {
    async function loadReaderView() {
      if (!feedItem) return;
      
      setLoading(true);
      setReaderView(null);
      
      try {
        const result = await workerService.fetchReaderView(feedItem.link);
        
        if (result.success && result.data.length > 0 && result.data[0].status === "ok") {
          setReaderView(result.data[0]);
        } else {
          throw new Error(result.message || "Failed to load reader view");
        }
      } catch (error) {
        console.error("Error fetching reader view:", error);
        toast({
          title: "Error",
          description: "Failed to load reader view. Please try again.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }

    loadReaderView();
  }, [feedItem, toast]);

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
        {loading ? (
          <LoadingSkeleton />
        ) : readerView ? (
          <div className="p-6">
            <article>
              <ArticleHeader 
                feedItem={feedItem} 
                readerView={readerView}
                layout="standard"
              />
              <ArticleContent 
                content={cleanedContent} 
                isModal={false}
                className="w-full md:max-w-4xl"
              />
            </article>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p>Failed to load content. Please try again.</p>
          </div>
        )}
      </Scrollbars>
    </div>
  );
} 