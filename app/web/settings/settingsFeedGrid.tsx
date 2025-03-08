import { SettingsFeedCard } from "./settingsFeedCard"

import { Feed } from "@/lib/api-schema"

interface SettingsFeedGridProps {
  feeds: Feed[]
  onDelete: (id: string) => void
  onCopy: (id: string) => void
}

export function SettingsFeedGrid({ feeds, onDelete, onCopy }: SettingsFeedGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {feeds.map((feed) => (
        <SettingsFeedCard
          feed={feed}
          onDelete={() => onDelete(feed.feedUrl)}
          onCopy={() => onCopy(feed.feedUrl)}
        />
      ))}
    </div>
  )
}

