"use client";

import { useMemo } from "react";
import { FeedItem } from "@/types";
import { BaseModal } from "./base-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReaderView } from "@/hooks/use-reader-view";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { ScrollShadow } from "./ui/scroll-shadow";
import { ReaderContent } from "@/components/Feed/ReaderContent";

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  initialThumbnailSrc?: string;
}

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  initialThumbnailSrc,
}: ReaderViewModalProps) {
  const { readerView, loading, cleanedContent } = useReaderView(feedItem, isOpen);
  const { scrollTop, isBottomVisible, handleScroll, hasScrolled } = useScrollShadow();
  
  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);

  const handleScrollEvent = (e: Event) => {
    const target = e.target as HTMLDivElement;
    handleScroll({ scrollTop: target.scrollTop, scrollHeight: target.scrollHeight, clientHeight: target.clientHeight });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      className=""
      itemId={feedItem.id}
    >
      <div className="relative h-full overflow-hidden">
        <ScrollShadow visible={hasScrolled} position="top" />
        
        <ScrollArea 
          variant="modal"
          className="h-full"
          onScroll={handleScrollEvent}
        > 
          <div className="mx-auto pb-20">
            <ReaderContent
              feedItem={feedItem}
              readerView={readerView}
              loading={loading}
              cleanedContent={cleanedContent}
              layout="modal"
              parallaxOffset={parallaxOffset}
              initialThumbnailSrc={initialThumbnailSrc}
            />
          </div>
        </ScrollArea>

        <ScrollShadow visible={isBottomVisible} position="bottom" />
      </div>
    </BaseModal>
  );
}