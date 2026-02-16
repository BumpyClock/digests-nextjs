"use client";

import { useEffect, useState } from "react";
import { FeedItem } from "@/types";
import { BaseModal } from "./base-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReaderView } from "@/hooks/queries";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { ScrollShadow } from "./ui/scroll-shadow";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { useFeedStore } from "@/store/useFeedStore";

// Selector for stable function reference — avoids full-store subscription
const selectMarkAsRead = (s: ReturnType<typeof useFeedStore.getState>) => s.markAsRead;
const OPEN_TRANSITION_DELAY_MS = 300;
const OPEN_TRANSITION_IDLE_TIMEOUT_MS = 340;

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  useViewTransition?: boolean;
}

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  useViewTransition,
}: ReaderViewModalProps) {
  const { readerView, loading, cleanedContent, cleanedMarkdown, extractedAuthor } = useReaderView(
    feedItem?.link || "",
    isOpen
  );
  const [transitionInProgress, setTransitionInProgress] = useState(false);
  const { isBottomVisible, handleScroll, hasScrolled } = useScrollShadow();
  const markAsRead = useFeedStore(selectMarkAsRead);
  const feedItemId = feedItem.id;

  const handleScrollEvent = (e: Event) => {
    const target = e.target as HTMLDivElement;
    handleScroll({
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    });
  };

  // Mark as read shortly after opening to avoid grid re-render during animation
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => markAsRead(feedItemId), 800);
    return () => clearTimeout(t);
  }, [isOpen, feedItemId, markAsRead]);

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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      className=""
      useViewTransition={useViewTransition}
      viewTransitionBackdropSettleMs={OPEN_TRANSITION_DELAY_MS}
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
    </BaseModal>
  );
}
