"use client"
import { Button } from "@/components/ui/button"
import { Share2, Download, ExternalLink } from "lucide-react"
import type { FeedItem } from "@/lib/rss"
import { BaseModal } from "@/components/base-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cleanupTextContent } from "@/utils/htmlUtils"
import { PodcastArtwork } from "../PodcastArtwork"
import { PodcastMetadata } from "../PodcastMetadata"
import { PodcastPlayButton } from "../shared/PodcastPlayButton"
import Image from "next/image"
import { getImageProps } from "@/utils/image-config"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"

interface PodcastDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  podcast: FeedItem
}

export function PodcastDetailsModal({ isOpen, onClose, podcast }: PodcastDetailsModalProps) {

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


  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={podcast.title}
    >
      <ScrollArea 
        variant="modal"
        className="h-full sm:h-[calc(95vh-2rem)]"
      >
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Hero Section with Image and Primary Info */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            {/* Podcast Artwork */}
            <div className="w-full max-w-[250px] mx-auto sm:max-w-[300px] lg:max-w-none lg:w-2/5">
              <PodcastArtwork
                src={podcast.thumbnail}
                alt={podcast.title}
                size="xl"
                showAmbilight={true}
                className="aspect-square rounded-2xl"
                priority={true}
                progressive={true}
              />
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
                    className="rounded w-6 h-6"
                    {...getImageProps("icon", "eager")}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    {podcast.siteTitle.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-medium text-lg">{cleanupTextContent(podcast.siteTitle)}</p>
              </div>

              {/* Metadata */}
              <PodcastMetadata
                published={podcast.published}
                duration={podcast.duration || (podcast.enclosures?.[0]?.length ? parseInt(podcast.enclosures[0].length) : undefined)}
                author={podcast.author ? cleanupTextContent(podcast.author) : undefined}
                variant="compact"
                className="mb-6"
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <PodcastPlayButton
                  podcast={podcast}
                  size="lg"
                  showLabel={true}
                  className="flex-1 sm:flex-initial"
                />
                
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
                __html: sanitizeReaderContent(podcast.content || podcast.description || '') 
              }} 
            />
          </div>
        </div>
      </ScrollArea>
    </BaseModal>
  )
}