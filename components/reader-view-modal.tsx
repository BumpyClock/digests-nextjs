"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { type FeedItem, type ReaderViewResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { BaseModal } from "./base-modal";
import { workerService } from "@/services/worker-service";
import { Scrollbars } from "react-custom-scrollbars-2";
import { 
  ArticleHeader, 
  ArticleContent, 
  LoadingSkeleton,
  processArticleContent
} from "@/components/Feed/ArticleReader/ArticleReader";

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  initialPosition: { x: number; y: number; width: number; height: number };
}

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  initialPosition,
}: ReaderViewModalProps) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [isBottomVisible, setIsBottomVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && readerView) {
      console.log("[ReaderViewModal] readerView:", readerView);
    }
  }, [isOpen, readerView]);

  const cleanedContent = processArticleContent(readerView);

  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: { 
    scrollTop: number, 
    scrollHeight: number, 
    clientHeight: number 
  }) => {
    setScrollTop(scrollTop);
    const bottomThreshold = 20;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    setIsBottomVisible(!isAtBottom);
  }, []);

  useEffect(() => {
    async function loadReaderView() {
      if (!isOpen) return;
      
      setLoading(true);
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
  }, [isOpen, feedItem.link, toast]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      initialPosition={initialPosition}
      className=""
    >
      <div className="relative">
        <div 
          id="reader-view-modal-top-shadow"
          className={`absolute top-[-10px] left-0 inset-shadow-black-500 right-0 bg-background/35 z-10 pointer-events-none transition-all ease-in-out dark:bg-background/85 duration-300 ${
            scrollTop > 0 ? 'opacity-100 h-24' : 'opacity-0 h-0'
          } [@supports_not_(backdrop-filter:blur(0))]:bg-background/90`}
          style={{
            filter: 'brightness(0.75)',
            backdropFilter: 'blur(40px)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)'
          }}
        />
        
        <Scrollbars 
          id="reader-view-modal-scroll"
          style={{ width: '100%', height: 'calc(100vh - 10px)' }}
          autoHide
          onScrollFrame={handleScroll}
        > 
          <div className="px-4 py-4 mx-auto">
            <div>
              {loading ? (
                <LoadingSkeleton />
              ) : readerView ? (
                <article>
                  <ArticleHeader 
                    feedItem={feedItem} 
                    readerView={readerView} 
                    parallaxOffset={parallaxOffset}
                    layout="modal"
                  />
                  <ArticleContent 
                    content={cleanedContent} 
                    isModal={true}
                    className="w-full md:max-w-4xl"
                  />
                </article>
              ) : (
                <div className="text-center">
                  <p>Failed to load reader view. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </Scrollbars>

        <div 
          id="reader-view-modal-bottom-shadow"
          className={`absolute inset-shadow-black-500 bottom-0 left-0 right-0 bg-background/35 z-10 pointer-events-none transition-all ease-in-out duration-300 ${
            isBottomVisible ? 'opacity-100 h-24' : 'opacity-0 h-0'
          } [@supports_not_(backdrop-filter:blur(0))]:bg-background/90`}
          style={{
            filter: 'brightness(0.75)',
            backdropFilter: 'blur(40px)',
            maskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.2) 80%, transparent 100%)'
          }}
        />
      </div>
    </BaseModal>
  );
}