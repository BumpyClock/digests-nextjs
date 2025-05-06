"use client";

import { useMemo } from "react";
import { FeedItem } from "@/types";
import { BaseModal } from "./base-modal";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useReaderView } from "@/hooks/use-reader-view";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { ScrollShadow } from "./ui/scroll-shadow";
import { ReaderContent } from "@/components/Feed/ReaderContent";

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
  const { scrollTop, isBottomVisible, handleScroll, hasScrolled } = useScrollShadow();
  
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
      <div className="relative">
        <ScrollShadow visible={hasScrolled} position="top" />
        
        <Scrollbars 
          style={{ width: '100%', height: 'calc(100vh - 10px)' }}
          autoHide
          onScrollFrame={handleScroll}
        > 
          <div className=" mx-auto">
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

        <ScrollShadow visible={isBottomVisible} position="bottom" />
      </div>
    </BaseModal>
  );
}