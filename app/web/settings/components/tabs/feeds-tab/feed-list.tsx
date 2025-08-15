import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useFeedsQuery } from "@/hooks/queries";
import { useFeedManagement } from "@/app/web/settings/hooks/use-feed-management";
import { SettingsFeedGrid } from "@/app/web/settings/settingsFeedGrid";

export const FeedList = memo(function FeedList() {
  const feedsQuery = useFeedsQuery();
  const feeds = feedsQuery.data?.feeds || [];
  const { handleRemoveFeed, handleCopyFeed } = useFeedManagement();

  if (feedsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading feeds...</p>
        </CardContent>
      </Card>
    );
  }

  if (feedsQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">Error loading feeds</p>
          <Button onClick={() => feedsQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (feeds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t added any feeds yet.
          </p>
          <Button onClick={() => document.getElementById("feed-url")?.focus()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Feed
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <SettingsFeedGrid
      feeds={feeds}
      onDelete={handleRemoveFeed}
      onCopy={handleCopyFeed}
    />
  );
});
