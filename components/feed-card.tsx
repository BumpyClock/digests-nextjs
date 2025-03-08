"use client"

import type React from "react"
import { useState, useRef, useCallback, memo } from "react"
import { Card, CardContent, CardFooter as CardFooterUI } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageSquare, Share2, Play, Pause } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAudio } from "@/components/audio-player-provider"
import { useToast } from "@/hooks/use-toast"
import { ReaderViewModal } from "@/components/reader-view-modal"
import { PodcastDetailsModal } from "@/components/podcast-details-modal"
import { formatDuration } from "@/utils/formatDuration"
import type { FeedItem } from "@/types"
import Image from "next/image"
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface FeedCardProps {
  feed: FeedItem
}

const CardFooter = memo(function CardFooter({
  liked,
  isTogglingFavorite,
  handleLikeClick,
  feedType,
  duration,
}: {
  liked: boolean
  isTogglingFavorite: boolean
  handleLikeClick: (e: React.MouseEvent) => void
  feedType: string
  duration?: number
}) {
  return (
    <CardFooterUI className="p-4 pt-0 flex justify-between">
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLikeClick} disabled={isTogglingFavorite}>
          <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span className="sr-only">Like</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MessageSquare className="h-4 w-4" />
          <span className="sr-only">Comment</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </div>
      {feedType === "podcast" && duration && (
        <div className="text-xs text-muted-foreground">{formatDuration(duration)}</div>
      )}
    </CardFooterUI>
  )
})

export const FeedCard = memo(function FeedCard({ feed: feedItem }: FeedCardProps) {
  const [liked, setLiked] = useState(feedItem.favorite || false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false)
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false)
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const { playAudio, isPlaying, currentAudio } = useAudio()
  const { toast } = useToast()

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setInitialPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
      }
      if (feedItem.type === "podcast") {
        console.log("opening podcast details")
        setIsPodcastDetailsOpen(true)
      } else {
        setIsReaderViewOpen(true)
      }
    },
    [feedItem.type],
  )

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (feedItem.type === "podcast") {
        playAudio({
          id: feedItem.id,
          title: feedItem.title,
          source: feedItem.siteTitle,
          audioUrl: feedItem.enclosures?.[0]?.url || "",
          image: feedItem.favicon || feedItem.thumbnail,
        })
      }
    },
    [feedItem, playAudio],
  )

  const handleLikeClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (isTogglingFavorite) return

      setIsTogglingFavorite(true)

      // Optimistic update
      setLiked((prev) => !prev)

      // TODO: Implement toggleFavorite functionality
      // For now, we'll just simulate a successful toggle
      const result = { success: true, message: "Favorite toggled" }

      if (!result.success) {
        // Revert optimistic update if failed
        setLiked((prev) => !prev)

        toast({
          title: "Error",
          description: result.message || "Failed to update favorite status",
          variant: "destructive",
        })
      }

      setIsTogglingFavorite(false)
    },
    [isTogglingFavorite, toast],
  )

  const formatDate = useCallback((dateString: string) => {
    return dayjs(dateString).fromNow()
  }, [])

  const isCurrentlyPlaying = currentAudio && currentAudio.id === feedItem.id && isPlaying

  return (
    <>
      <Card
        ref={cardRef}
        className="w-full overflow-hidden transition-all hover:shadow-md cursor-pointer rounded-[40px]"
        onClick={handleCardClick}
      >
        <div className="relative w-full p-2">
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={feedItem.thumbnail || feedItem.thumbnail || "/placeholder.svg"}
              alt={feedItem.title}
              height={300}
              width={300}
              className="w-full h-full object-cover rounded-[32px] aspect-auto"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {feedItem.type === "podcast" && (
            <Button size="icon" className="absolute bottom-4 right-4 rounded-full" onClick={handlePlayClick}>
              {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">{isCurrentlyPlaying ? "Pause" : "Play"}</span>
            </Button>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div id={`feed-card-header-${feedItem.id}`} className="flex flex-wrap items-center justify-between gap-2 font-regular">
              <div className="flex space-between gap-2 align-center items-center ">
                {feedItem.favicon && (
                  <Image 
                    src={feedItem.favicon} 
                    alt={`${feedItem.siteTitle} favicon`}
                    className="w-5 h-5 rounded-[4px] border border-black-500"
                    height={48}
                    width={48}
                  />
                )}
                <div className="text-xs  line-clamp-1 font-regular">{feedItem.feedTitle}</div>
              </div>
              <div className="text-xs text-muted-foreground w-fit font-medium">{formatDate(feedItem.published)}</div>
            </div>
            <h3 className="font-medium">{feedItem.title}</h3>
            {feedItem.author && (
              <div className="text-sm text-muted-foreground">By {feedItem.author}</div>
            )}
            <p className="text-sm text-muted-foreground line-clamp-3">{feedItem.description}</p>
          </div>
        </CardContent>
        <CardFooter
          liked={liked}
          isTogglingFavorite={isTogglingFavorite}
          handleLikeClick={handleLikeClick}
          feedType={feedItem.type}
          duration={feedItem.duration ? feedItem.duration : undefined}
        />
      </Card>
      {feedItem.type === "podcast" ? (
        <PodcastDetailsModal
          isOpen={isPodcastDetailsOpen}
          onClose={() => setIsPodcastDetailsOpen(false)}
          podcast={feedItem}
          initialPosition={initialPosition}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => setIsReaderViewOpen(false)}
          articleUrl={feedItem.link}
          initialPosition={initialPosition}
        />
      )}
    </>
  )
})

