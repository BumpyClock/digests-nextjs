"use client"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { useAudio } from "@/components/audio-player-provider"
import { formatDuration } from "@/utils/formatDuration"
import type { FeedItem } from "@/lib/rss"
import { BaseModal } from "./base-modal"

interface PodcastDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  podcast: FeedItem
  initialPosition: { x: number; y: number; width: number; height: number }
}

export function PodcastDetailsModal({ isOpen, onClose, podcast, initialPosition }: PodcastDetailsModalProps) {
  const { playAudio, isPlaying, currentAudio } = useAudio()

  const handlePlayPause = () => {
    playAudio({
      id: podcast.id,
      title: podcast.title,
      source: podcast.siteTitle,
      audioUrl: podcast.enclosures[0]?.url || "",
      image: podcast.thumbnail || podcast.feedImage,
    })
  }

  const isCurrentlyPlaying = currentAudio && currentAudio.id === podcast.id && isPlaying

  const duration = formatDuration(
    Number.parseInt(podcast.duration) || Number.parseInt(podcast.enclosures?.[0]?.length) || 0,
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={podcast.title}
      link={podcast.link}
      initialPosition={initialPosition}
    >
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="relative w-full md:w-1/3 aspect-square overflow-hidden rounded-lg">
          <img
            src={podcast.thumbnail || podcast.feedImage || "/placeholder.svg"}
            alt={podcast.title}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
              {podcast.siteTitle.charAt(0).toUpperCase()}
            </div>
            <p className="font-medium">{podcast.siteTitle}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {new Date(podcast.published).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            • {duration}
          </p>
          <Button onClick={handlePlayPause}>
            {isCurrentlyPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isCurrentlyPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Episode Description</h2>
        <div className="prose prose-sm dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: podcast.content || podcast.description }} />
        </div>
      </div>
    </BaseModal>
  )
}

