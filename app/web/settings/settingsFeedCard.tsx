"use client"

import { ThumbsUp, Trash2, Copy} from "lucide-react"
import Image from "next/image"
import noise from "@/public/noise.svg"
import placeholderRss from "@/public/placeholder-rss.svg"
import placeholderPodcast from "@/public/placeholder-podcast.svg"
import { Feed } from "@/lib/api-schema"

interface FeedCardProps {
  feed: Feed;
  onDelete?: () => void
  onCopy?: () => void
}

export function SettingsFeedCard({ feed, onDelete, onCopy }: FeedCardProps) {
  return (
    <div className="relative overflow-hidden group transition-all duration-200 group-hover:scale-105 group-hover:translate-y-[-8px]">
    <div id={`settings-feed-card-${feed.feedUrl}`} className=" relative  p-5 flex flex-col h-full z-2">
      <div className="flex-1">
        <div className="mb-4  transition-all duration-300 group-hover:translate-y-[-8px]">
          <Image src={feed.favicon || (feed.type === 'podcast' ? placeholderPodcast : placeholderRss)} alt={`${feed.siteTitle} icon`} width={48} height={48} className="rounded-sm group-hover:scale-110 transition-all duration-200" />
        </div>
        <h3 className="font-bold text-sm mb-1 line-clamp-2">{feed.siteTitle}</h3>
        {feed.feedTitle && <p className="text-caption text-sm mb-2">{feed.feedTitle}</p>}
        <p className="text-muted-foreground text-sm break-all opacity-0 group-hover:opacity-100 transition-opacity duration-200">{feed.feedUrl}</p>
      </div>
      <div className="flex mt-6 pt-2 border-t border-gray-100">
        <button
          onClick={onDelete}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Delete feed"
        >
          <Trash2 size={18} className="text-gray-500" />
        </button>
        <button
          onClick={onCopy}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Copy feed URL"
        >
          <Copy size={18} className="text-gray-500" />
        </button>
      </div>
    </div>
    <div className="absolute top-0 left-0 w-full h-full z-[-1]">
    <div id={`settings-feed-card-${feed.feedUrl}-noise`} className="absolute top-0 left-0 w-full h-full opacity-5 bg-cover bg-center rounded-xl z-[-1]" style={{ backgroundImage: `url(${noise.src})` }} />
    <div id={`settings-feed-card-${feed.feedUrl}-imageblur`} className="absolute top-0 left-0 w-full h-full bg-cover bg-center rounded-xl z-[-1] blur-[80px] brightness-50 opacity-15 transition-opacity duration-200 group-hover:opacity-30" style={{ backgroundImage: `url(${feed.favicon})` }} />
    </div>
    <div className="absolute top-0 left-0 w-full h-full bg-card border rounded-xl shadow-2xl z-[-3]"></div>
    </div>
  )
}

