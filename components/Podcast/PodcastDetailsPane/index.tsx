"use client";

import { EmptyState } from "@/components/Feed/ArticleReader";
import { AdaptiveDetailContainer } from "@/components/Feed/shared/AdaptiveDetailContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDelayedMarkAsRead } from "@/hooks/use-delayed-mark-as-read";
import { useIsMobile } from "@/hooks/use-media-query";
import { type FeedItem } from "@/types";
import { PodcastDetailsContent } from "../shared/PodcastDetailsContent";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
  onClose?: () => void;
}

const noop = () => {
  // Intentionally empty: close callback is optional for pane mode.
};

export function PodcastDetailsPane({ feedItem, onClose = noop }: PodcastDetailsPaneProps) {
  useDelayedMarkAsRead(feedItem?.id, Boolean(feedItem), 2000);
  const isMobile = useIsMobile();
  const containerPadding = isMobile ? "p-4 sm:p-6 md:p-8 lg:p-10" : "p-6";

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
      <ScrollArea className="h-full w-full">
        <div className={containerPadding}>
          <PodcastDetailsContent
            podcast={feedItem}
            showAmbilight={true}
            variant={isMobile ? "modal" : "pane"}
          />
        </div>
      </ScrollArea>
    </AdaptiveDetailContainer>
  );
}
