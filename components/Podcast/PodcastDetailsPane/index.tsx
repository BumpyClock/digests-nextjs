"use client";

import { EmptyState } from "@/components/Feed/ArticleReader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type FeedItem } from "@/types";
import { PodcastDetailsContent } from "../shared/PodcastDetailsContent";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
}

export function PodcastDetailsPane({ feedItem }: PodcastDetailsPaneProps) {
  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <ScrollArea className="h-full w-full">
        <div className="p-6">
          <PodcastDetailsContent podcast={feedItem} showAmbilight={true} variant="pane" />
        </div>
      </ScrollArea>
    </div>
  );
}
