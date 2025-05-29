import { memo, useCallback, useState } from "react"
import { Trash2, Copy } from "lucide-react"
import Image from "next/image"
import noise from "@/public/noise.svg"
import placeholderRss from "@/public/placeholder-rss.svg"
import placeholderPodcast from "@/public/placeholder-podcast.svg"
import type { Feed } from "@/types"
import { Ambilight } from "@/components/ui/ambilight"

/**
 * Props for the SettingsFeedCard component
 */
interface FeedCardProps {
  /** Feed data to display */
  feed: Feed;
  /** Optional callback for when the delete button is clicked */
  onDelete?: () => void
  /** Optional callback for when the copy button is clicked */
  onCopy?: () => void
}

/**
 * Card component for displaying feed information in the settings page.
 * Includes delete and copy functionality with hover effects and animations.
 */
export const SettingsFeedCard = memo(function SettingsFeedCard({ feed, onDelete, onCopy }: FeedCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = useCallback(() => {
    onDelete?.()
  }, [onDelete])

  const handleCopy = useCallback(() => {
    onCopy?.()
  }, [onCopy])

  const placeholderImage = feed.type === 'podcast' ? placeholderPodcast : placeholderRss

  return (
    <div 
      className="relative group transition-all duration-200 group-hover:scale-105 group-hover:translate-y-[-8px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div id={`settings-feed-card-${feed.feedUrl}`} className="relative p-5 flex flex-col h-full z-2">
        <div className="flex-1">
          <div className="mb-4 transition-all duration-300 group-hover:translate-y-[-4px]">
            <Ambilight
              className="relative w-[48px] h-[48px] rounded-sm overflow-hidden"
              parentHovered={isHovered}
              opacity={{ rest: 0, hover: 0.3 }}
            >
              <Image 
                src={feed.favicon || placeholderImage} 
                alt={`${feed.siteTitle} icon`} 
                width={48} 
                height={48} 
                className="rounded-sm group-hover:scale-110 transition-all duration-200" 
              />
            </Ambilight>
          </div>
          <h3 className="font-bold text-sm mb-1 line-clamp-2">{feed.siteTitle}</h3>
          {feed.feedTitle && <p className="text-caption text-sm mb-2">{feed.feedTitle}</p>}
          <p className="text-muted-foreground text-sm break-all opacity-0 group-hover:opacity-100 transition-opacity duration-200">{feed.feedUrl}</p>
        </div>
        <div className="flex mt-6 pt-2 border-t border-gray-100">
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Delete feed"
          >
            <Trash2 size={18} className="text-gray-500" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Copy feed URL"
          >
            <Copy size={18} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl absolute top-0 left-0 w-full h-full z-[-1]">
        <div 
          id={`settings-feed-card-${feed.feedUrl}-noise`} 
          className="overflow-hidden absolute top-0 left-0 w-full h-full opacity-5 bg-cover bg-center" 
          style={{ backgroundImage: `url(${noise.src})` }} 
        />
        <div 
          id={`settings-feed-card-${feed.feedUrl}-imageblur`} 
          className="absolute overflow-hidden top-0 left-0 w-full h-full bg-cover bg-center blur-[80px] brightness-80 opacity-15 transition-all duration-200 group-hover:opacity-30 group-hover:blur-[100px] group-hover:brightness-120" 
          style={{ backgroundImage: `url(${feed.favicon || placeholderImage})` }} 
        />
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-card border rounded-xl shadow-md z-[-3] group-hover:shadow-xl transition-all duration-200"></div>
    </div>
  )
}) 