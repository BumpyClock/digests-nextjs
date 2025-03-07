"use client"

import type React from "react"
import { useState, useRef, useCallback, memo, useMemo } from "react"
import { Card, CardContent, CardFooter as CardFooterUI } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageSquare, Share2, Play, Pause } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAudio } from "@/components/audio-player-provider"
import { useToast } from "@/hooks/use-toast"
import { ReaderViewModal } from "@/components/reader-view-modal"
import { PodcastDetailsModal } from "@/components/podcast-details-modal"
import { formatDuration } from "@/utils/formatDuration"
import type { FeedItem } from "@/lib/rss"

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

export const FeedCard = memo(function FeedCard({ feed }: FeedCardProps) {
  const [liked, setLiked] = useState(feed.favorite || false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isReaderViewOpen, setIsReaderViewOpen] = useState(false)
  const [isPodcastDetailsOpen, setIsPodcastDetailsOpen] = useState(false)
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
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
      if (feed.type === "podcast") {
        console.log("opening podcast details")
        setIsPodcastDetailsOpen(true)
      } else {
        setIsReaderViewOpen(true)
      }
    },
    [feed.type],
  )

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (feed.type === "podcast") {
        playAudio({
          id: feed.id,
          title: feed.title,
          source: feed.siteTitle,
          audioUrl: feed.enclosures?.[0]?.url || "",
          image: feed.favicon || feed.thumbnail,
        })
      }
    },
    [feed, playAudio],
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

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) return "just now"
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

      return date.toLocaleDateString()
    }
  }, [])

  const isCurrentlyPlaying = currentAudio && currentAudio.id === feed.id && isPlaying

  return (
    <>
      <Card
        ref={cardRef}
        className="w-full overflow-hidden transition-all hover:shadow-md cursor-pointer rounded-[40px]"
        onClick={handleCardClick}
      >
        <div className="relative w-full p-2">
          <img
            src={feed.thumbnail || feed.thumbnail || "/placeholder.svg"}
            alt={feed.title}
            className="w-full h-full object-cover rounded-[32px]"
            style={{ aspectRatio: "16/9" }}
          />
          {feed.type === "podcast" && (
            <Button size="icon" className="absolute bottom-4 right-4 rounded-full" onClick={handlePlayClick}>
              {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">{isCurrentlyPlaying ? "Pause" : "Play"}</span>
            </Button>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {feed.favicon && (
                  <img 
                    src={feed.favicon} 
                    alt={`${feed.siteTitle} favicon`}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <div className="text-sm font-medium">{feed.siteTitle}</div>
              </div>
              <div className="text-xs text-muted-foreground">{formatDate(feed.published)}</div>
            </div>
            <h3 className="font-semibold">{feed.title}</h3>
            {feed.author && (
              <div className="text-sm text-muted-foreground">By {feed.author}</div>
            )}
            <p className="text-sm text-muted-foreground line-clamp-3">{feed.description}</p>
          </div>
        </CardContent>
        <CardFooter
          liked={liked}
          isTogglingFavorite={isTogglingFavorite}
          handleLikeClick={handleLikeClick}
          feedType={feed.type}
          duration={feed.duration ? feed.duration : undefined}
        />
      </Card>
      {feed.type === "podcast" ? (
        <PodcastDetailsModal
          isOpen={isPodcastDetailsOpen}
          onClose={() => setIsPodcastDetailsOpen(false)}
          podcast={feed}
          initialPosition={initialPosition}
        />
      ) : (
        <ReaderViewModal
          isOpen={isReaderViewOpen}
          onClose={() => setIsReaderViewOpen(false)}
          articleUrl={feed.link}
          initialPosition={initialPosition}
        />
      )}
    </>
  )
})

