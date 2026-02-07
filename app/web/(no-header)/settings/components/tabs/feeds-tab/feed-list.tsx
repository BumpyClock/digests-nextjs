import { Plus } from "lucide-react";
import { memo } from "react";
import { useFeedManagement } from "@/app/web/(no-header)/settings/hooks/use-feed-management";
import { SettingsFeedGrid } from "@/app/web/(no-header)/settings/settingsFeedGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscriptions } from "@/hooks/useFeedSelectors";

export interface FeedListProps {
  onAddFeed: () => void;
}

export const FeedList = memo(function FeedList({ onAddFeed }: FeedListProps) {
  const feeds = useSubscriptions();
  const { handleRemoveFeed, handleCopyFeed } = useFeedManagement();

  if (feeds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="mb-4 text-body text-secondary-content">You haven&apos;t added any feeds yet.</p>
          <Button onClick={onAddFeed}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Feed
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SettingsFeedGrid feeds={feeds} onDelete={handleRemoveFeed} onCopy={handleCopyFeed} />;
});
