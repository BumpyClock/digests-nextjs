"use client";

import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/Feed/ArticleReader/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";
import { type FeedItem } from "@/types";
import { PodcastDetailsContent } from "../shared/PodcastDetailsContent";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
}

/**
 * Render a pane displaying details for a podcast feed item and mark the item as read after two seconds of viewing.
 *
 * @param feedItem - The feed item to display; when `null`, an empty state is rendered.
 * @returns The React element for the podcast details pane or an empty state when `feedItem` is `null`.
 */
export function PodcastDetailsPane({ feedItem }: PodcastDetailsPaneProps) {
  const { markAsRead } = useFeedStore();

  // Mark as read after viewing
  useEffect(() => {
    if (feedItem) {
      const timer = setTimeout(() => {
        markAsRead(feedItem.id);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [feedItem, markAsRead]);

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <ScrollArea
        className="h-full w-full"
      >
        <div className="p-6">
          <PodcastDetailsContent
            podcast={feedItem}
            showAmbilight={true}
            variant="pane"
          />
        </div>
      </ScrollArea>
    </div>
  );
}