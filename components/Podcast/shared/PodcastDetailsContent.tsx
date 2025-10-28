import Image from "next/image"
import type { FeedItem } from "@/types"
import { cleanupTextContent } from "@/utils/htmlUtils"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"
import { getImageProps } from "@/utils/image-config"
import { isValidUrl } from "@/utils/url"
import { PodcastArtwork } from "../PodcastArtwork"
import { PodcastMetadata } from "../PodcastMetadata"
import { PodcastPlayButton } from "./PodcastPlayButton"
import { parsePodcastDuration } from "./podcastUtils"

interface PodcastDetailsContentProps {
  podcast: FeedItem
  /** Additional action buttons to display (e.g., share, download) */
  actionButtons?: React.ReactNode
  /** Whether to show ambilight effect on artwork */
  showAmbilight?: boolean
  /** Layout variant */
  variant?: "modal" | "pane"
}

/**
 * Shared podcast details content component
 * Used by both PodcastDetailsModal and PodcastDetailsPane
 */
export function PodcastDetailsContent({
  podcast,
  actionButtons,
  showAmbilight = false,
  variant = "pane"
}: PodcastDetailsContentProps) {
  const isModal = variant === "modal"

  return (
    <>
      {/* Hero Section with Image and Primary Info */}
      <div className={`flex flex-col gap-6 mb-6 ${isModal ? 'lg:flex-row lg:gap-8' : podcast.thumbnail ? 'lg:flex-row' : ''}`}>
        {/* Podcast Artwork */}
        {podcast.thumbnail && (
          <div className={isModal
            ? "w-full max-w-[250px] mx-auto sm:max-w-[300px] lg:max-w-none lg:w-2/5"
            : "relative w-full lg:w-1/3"
          }>
            <PodcastArtwork
              src={podcast.thumbnail}
              alt={podcast.title}
              size="xl"
              showAmbilight={showAmbilight}
              className={isModal ? "aspect-square rounded-2xl" : "aspect-square rounded-lg w-full"}
              priority={isModal}
              progressive={isModal}
            />
          </div>
        )}

        {/* Podcast Info */}
        <div className={isModal ? "flex-1 flex flex-col justify-center" : (podcast.thumbnail ? "flex-1" : "w-full")}>
          {/* Podcast Title */}
          <h1 className={isModal
            ? "text-2xl md:text-3xl font-bold mb-4 line-clamp-3"
            : "text-2xl font-bold mb-4"
          }>
            {cleanupTextContent(podcast.title)}
          </h1>

          {/* Podcast Channel */}
          <div className={`flex items-center gap-2 mb-4`}>
            {podcast.favicon && isValidUrl(podcast.favicon) ? (
              <Image
                src={podcast.favicon}
                alt={podcast.siteTitle}
                className="rounded w-6 h-6"
                {...(isModal ? getImageProps("icon", "eager") : { width: 24, height: 24 })}
              />
            ) : (
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                {podcast.siteTitle.charAt(0).toUpperCase()}
              </div>
            )}
            <p className={`font-medium ${isModal ? 'text-lg' : ''}`}>
              {cleanupTextContent(podcast.siteTitle)}
            </p>
          </div>

          {/* Metadata */}
          <PodcastMetadata
            published={podcast.published}
            duration={parsePodcastDuration(podcast)}
            author={podcast.author ? cleanupTextContent(podcast.author) : undefined}
            variant="compact"
            className={isModal ? "mb-6" : "mb-4"}
          />

          {/* Action Buttons */}
          <div className={isModal ? "flex flex-wrap gap-3" : ""}>
            <PodcastPlayButton
              podcast={podcast}
              size="lg"
              showLabel={true}
              className={isModal ? "flex-1 sm:flex-initial" : ""}
            />

            {actionButtons && (
              <div className="flex gap-2">
                {actionButtons}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episode Description */}
      <div className={isModal ? "border-t pt-8" : "space-y-4"}>
        <h2 className="text-xl font-bold mb-4">Episode Description</h2>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: sanitizeReaderContent(podcast.content || podcast.description || '')
          }}
        />
      </div>
    </>
  )
}
