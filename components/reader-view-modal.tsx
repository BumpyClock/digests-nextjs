"use client";

import { useCallback, useState, useMemo } from "react";
import { FeedItem } from "@/types";
import { BaseModal } from "./base-modal";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useReaderView } from "@/hooks/use-reader-view";
import { ScrollShadow } from "./ui/scroll-shadow";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { ScrollData } from "@/types/reader";

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
  const { readerView, loading, cleanedContent } = useReaderView(feedItem, isOpen);
  const [scrollTop, setScrollTop] = useState(0);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(true);
  
  // Manage scroll state for both parallax and shadow fallbacks
  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: ScrollData) => {
    setScrollTop(scrollTop);
    
    // For fallback scrollshadow visibility (browsers without scroll-timeline)
    setShowTopShadow(scrollTop > 10);
    setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 10);
  }, []);
  
  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      initialPosition={initialPosition}
      className=""
    >
      <div className="relative overflow-hidden">
        {/* Scroll indicators with fallback support */}
        <ScrollShadow position="top" enhanced visible={showTopShadow} />
        
        <Scrollbars 
          style={{ width: '100%', height: 'calc(100vh - 10px)' }}
          autoHide
          onScrollFrame={handleScroll}
        > 
          <div className="mx-auto">
            <ReaderContent
              feedItem={feedItem}
              readerView={readerView}
              loading={loading}
              cleanedContent={cleanedContent}
              layout="modal"
              parallaxOffset={parallaxOffset}
            />
          </div>
        </Scrollbars>

        <ScrollShadow position="bottom" enhanced visible={showBottomShadow} />
      </div>
    </BaseModal>
  );
}