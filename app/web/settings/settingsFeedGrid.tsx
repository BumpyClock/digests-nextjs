import { memo } from "react";
import { SettingsFeedCard } from "./components/settings-feed-card";
import type { Feed } from "@/types";

interface SettingsFeedGridProps {
  feeds: Feed[];
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
}

export const SettingsFeedGrid = memo(function SettingsFeedGrid({
  feeds,
  onDelete,
  onCopy,
}: SettingsFeedGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {feeds.map((feed) => (
        <SettingsFeedCard
          key={feed.feedUrl}
          feed={feed}
          onDelete={() => onDelete(feed.feedUrl)}
          onCopy={() => onCopy(feed.feedUrl)}
        />
      ))}
    </div>
  );
});
