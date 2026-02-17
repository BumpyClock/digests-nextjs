"use client";

import { EmptyState } from "@/components/Feed/ArticleReader";
import { DetailPaneShell } from "@/components/Feed/shared/DetailPaneShell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDelayedMarkAsRead } from "@/hooks/use-delayed-mark-as-read";
import { type FeedItem } from "@/types";
import { PodcastDetailsContent } from "../shared/PodcastDetailsContent";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
}

export function PodcastDetailsPane({ feedItem }: PodcastDetailsPaneProps) {
  useDelayedMarkAsRead(feedItem?.id, Boolean(feedItem), 2000);

  if (!feedItem) {
    return <EmptyState />;
  }

  return (
    <DetailPaneShell>
      <ScrollArea className="h-full w-full">
        <div className="p-6">
          <PodcastDetailsContent podcast={feedItem} showAmbilight={true} variant="pane" />
        </div>
      </ScrollArea>
    </DetailPaneShell>
  );
}
