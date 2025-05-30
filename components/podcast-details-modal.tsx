"use client"
import { Button } from "@/components/ui/button"
import { Play, Pause, Clock, Calendar, Share2, Download, ExternalLink } from "lucide-react"
import { useAudioActions, useIsAudioPlaying } from "@/hooks/useFeedSelectors"
import { formatDuration } from "@/utils/formatDuration"
import type { FeedItem } from "@/lib/rss"
import { BaseModal } from "./base-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { toast } from "sonner"
import { Ambilight } from "@/components/ui/ambilight"
import { cleanupTextContent } from "@/utils/htmlUtils"

interface PodcastDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  podcast: FeedItem
  initialPosition: { x: number; y: number; width: number; height: number }
}

export function PodcastDetailsModal({ isOpen, onClose, podcast, initialPosition }: PodcastDetailsModalProps) {
  const { playAudio } = useAudioActions()
  const isCurrentlyPlaying = useIsAudioPlaying(podcast.id)

  const handlePlayPause = () => {
    playAudio({
      id: podcast.id,
      title: podcast.title,
      source: podcast.siteTitle,
      audioUrl: podcast.enclosures?.[0]?.url || "",
      image: podcast.thumbnail || podcast.favicon,
    })
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: podcast.title,
          text: `Listen to ${podcast.title} from ${podcast.siteTitle}`,
          url: podcast.link,
        })
      } else {
        await navigator.clipboard.writeText(podcast.link)
        toast.success("Link copied to clipboard")
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Failed to share")
      }
    }
  }

  const handleDownload = () => {
    const audioUrl = podcast.enclosures?.[0]?.url
    if (audioUrl) {
      window.open(audioUrl, '_blank')
    }
  }

  const duration = formatDuration(
    podcast.duration || podcast.enclosures?.[0]?.length || "0"
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={podcast.title}
      initialPosition={initialPosition}
    >
      <ScrollArea 
        variant="modal"
        className="h-[calc(100vh-100px)] lg:h-[calc(95vh-100px)]"
      >
        <div className="p-6 md:p-8 lg:p-10">
          {/* Hero Section with Image and Primary Info */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8">
            {/* Podcast Artwork */}
            <div className="w-full lg:w-2/5">
              {podcast.thumbnail ? (
                <Ambilight
                  className="relative aspect-square overflow-hidden rounded-2xl"
                  isActive={true}
                  opacity={{ rest: 0.4, hover: 0.6 }}
                >
                  <Image
                    src={podcast.thumbnail}
                    alt={podcast.title}
                    className="object-cover w-full h-full"
                    width={400}
                    height={400}
                    priority
                  />
                </Ambilight>
              ) : (
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted flex items-center justify-center">
                  <div className="text-6xl font-bold text-muted-foreground">
                    {podcast.siteTitle.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {/* Podcast Info */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Podcast Title */}
              <h1 className="text-2xl md:text-3xl font-bold mb-4 line-clamp-3">
                {cleanupTextContent(podcast.title)}
              </h1>

              {/* Podcast Channel */}
              <div className="flex items-center gap-2 mb-4">
                {podcast.favicon ? (
                  <Image
                    src={podcast.favicon}
                    alt={podcast.siteTitle}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    {podcast.siteTitle.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-medium text-lg">{cleanupTextContent(podcast.siteTitle)}</p>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(podcast.published).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{duration}</span>
                </div>
              </div>

              {/* Author */}
              {podcast.author && (
                <p className="text-sm text-muted-foreground mb-6">
                  By {cleanupTextContent(podcast.author)}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  size="lg" 
                  onClick={handlePlayPause}
                  className="flex-1 sm:flex-initial"
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pause Episode
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Play Episode
                    </>
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleShare}
                    title="Share episode"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  
                  {podcast.enclosures?.[0]?.url && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleDownload}
                      title="Download episode"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="icon"
                    variant="outline"
                    asChild
                    title="Open in browser"
                  >
                    <a href={podcast.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Episode Description */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold mb-4">Episode Description</h2>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: podcast.content || podcast.description 
              }} 
            />
          </div>
        </div>
      </ScrollArea>
    </BaseModal>
  )
}