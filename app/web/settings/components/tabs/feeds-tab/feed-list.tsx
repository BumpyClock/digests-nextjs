import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useSubscriptions } from "@/hooks/useFeedSelectors";
import { useFeedManagement } from "@/app/web/settings/hooks/use-feed-management";
import { SettingsFeedGrid } from "@/app/web/settings/settingsFeedGrid";

export const FeedList = memo(function FeedList() {
  const feeds = useSubscriptions();
  const { handleRemoveFeed, handleCopyFeed } = useFeedManagement();

  if (feeds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">You haven&apos;t added any feeds yet.</p>
          <Button onClick={() => document.getElementById("feed-url")?.focus()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Feed
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SettingsFeedGrid feeds={feeds} onDelete={handleRemoveFeed} onCopy={handleCopyFeed} />;
});
