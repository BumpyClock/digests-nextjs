"use client";

import { useEffect, useState } from "react";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdaptiveDetailContainer } from "@/components/Feed/shared/AdaptiveDetailContainer";
import { useReaderView } from "@/hooks/queries";
import { useDelayedMarkAsRead } from "@/hooks/use-delayed-mark-as-read";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { FeedItem } from "@/types";
import { ScrollShadow } from "./ui/scroll-shadow";

const OPEN_TRANSITION_DELAY_MS = 300;
const OPEN_TRANSITION_IDLE_TIMEOUT_MS = 340;

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  useViewTransition?: boolean;
  viewTransitionBackdropSettled?: boolean;
}

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  useViewTransition,
  viewTransitionBackdropSettled,
}: ReaderViewModalProps) {
  const { readerView, loading, cleanedContent, cleanedMarkdown, extractedAuthor } = useReaderView(
    feedItem.link,
    isOpen
  );
  const [transitionInProgress, setTransitionInProgress] = useState(false);
  const { isBottomVisible, handleScroll, hasScrolled } = useScrollShadow();
  useDelayedMarkAsRead(feedItem.id, isOpen, 800);

  const handleScrollEvent = (e: Event) => {
    const target = e.target as HTMLDivElement;
    handleScroll({
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    });
  };

  // Keep first paint light, then mount heavy reader content after open transition settles.
  useEffect(() => {
    if (!isOpen) {
      setTransitionInProgress(false);
      return;
    }

    setTransitionInProgress(true);

    const start = performance.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const finishTransition = () => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, OPEN_TRANSITION_DELAY_MS - elapsed);
      timeoutId = setTimeout(() => setTransitionInProgress(false), remaining);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(finishTransition, {
        timeout: OPEN_TRANSITION_IDLE_TIMEOUT_MS,
      });
    } else {
      timeoutId = setTimeout(() => setTransitionInProgress(false), OPEN_TRANSITION_DELAY_MS);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (
        idleCallbackId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [isOpen]);

  return (
    <AdaptiveDetailContainer
      mode="modal"
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      itemId={feedItem.id}
      useViewTransition={useViewTransition}
      viewTransitionBackdropSettled={viewTransitionBackdropSettled}
      viewTransitionBackdropSettleMs={useViewTransition ? OPEN_TRANSITION_DELAY_MS : undefined}
    >
      <div className="relative h-full overflow-hidden">
        <ScrollShadow visible={!transitionInProgress && hasScrolled} position="top" />

        <ScrollArea variant="modal" className="h-full" onScroll={handleScrollEvent}>
          <div className="mx-auto pb-20">
            <ReaderContent
              feedItem={feedItem}
              readerView={readerView}
              loading={loading}
              cleanedContent={cleanedContent}
              cleanedMarkdown={cleanedMarkdown}
              extractedAuthor={extractedAuthor}
              layout="modal"
              transitionInProgress={transitionInProgress}
            />
          </div>
        </ScrollArea>

        <ScrollShadow visible={!transitionInProgress && isBottomVisible} position="bottom" />
      </div>
    </AdaptiveDetailContainer>
  );
}
