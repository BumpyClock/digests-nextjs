"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bookmark, Share2 } from "lucide-react"
import { useFeedsData } from "@/hooks/queries"
import { fetchFeedsAction } from "@/app/actions"
import type { FeedItem } from "@/types/feed"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton"
import { ContentNotFound } from "@/components/ContentNotFound"
import { useContentActions } from "@/hooks/use-content-actions"
import { useRouter, useParams } from "next/navigation"
import { PodcastPlayButton } from "@/components/Podcast/shared/PodcastPlayButton"
import { PodcastArtwork } from "@/components/Podcast/PodcastArtwork"

export default function PodcastPage() {
  const params = useParams();
  const router = useRouter()
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("podcast")

  // Use React Query to get feeds data (single source of truth)
  const feedsQuery = useFeedsData()

  // Fallback state for cold-start navigation (when item not in React Query cache)
  const [fallbackPodcast, setFallbackPodcast] = useState<FeedItem | null>(null)
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [fallbackAttempted, setFallbackAttempted] = useState(false)

  // Find the podcast from feeds data
  const id = params?.id as string | undefined
  const cachedPodcast = feedsQuery.data?.items?.find((item: FeedItem) => item.id === id && item.type === "podcast")

  // Use cached podcast if available, otherwise use fallback
  const podcast = cachedPodcast || fallbackPodcast

  // Derive bookmark state directly from React Query data
  // Local state is only for optimistic UI updates
  const [optimisticBookmark, setOptimisticBookmark] = useState<boolean | null>(null)
  const isBookmarked = optimisticBookmark ?? (podcast?.favorite || false)

  // Fallback fetch when item not in cache (e.g., cold-start direct navigation)
  useEffect(() => {
    async function fetchFallback() {
      if (!id || cachedPodcast || fallbackAttempted || feedsQuery.isLoading) return

      setFallbackLoading(true)
      setFallbackAttempted(true)

      const { success, items } = await fetchFeedsAction(id)

      if (success && items) {
        const foundPodcast = items.find((item: FeedItem) => item.id === id && item.type === "podcast")
        if (foundPodcast) {
          setFallbackPodcast(foundPodcast)
        }
      }

      setFallbackLoading(false)
    }

    fetchFallback()
  }, [id, cachedPodcast, fallbackAttempted, feedsQuery.isLoading])

  const handleBookmark = async () => {
    if (!podcast) return
    try {
      await bookmarkAction(podcast.id, isBookmarked, setOptimisticBookmark)
    } finally {
      // Clear optimistic state so React Query becomes source of truth
      setOptimisticBookmark(null)
    }
  }

  if (feedsQuery.isLoading || fallbackLoading) {
    return <ContentPageSkeleton />
  }

  if (!podcast) {
    return <ContentNotFound contentType="Podcast" />
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <PodcastArtwork
            src={podcast.thumbnail}
            alt={podcast.title}
            size="xl"
            className="w-full md:w-1/3"
            priority
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{podcast.title}</h1>
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                {podcast.siteTitle?.charAt(0).toUpperCase() || podcast.link.charAt(0).toUpperCase()}
              </div>
              <p className="font-medium">{podcast.siteTitle || podcast.link}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(podcast.published).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              • {podcast.duration || "45 min"}
            </p>
            <div className="flex space-x-2 mb-6">
              <PodcastPlayButton podcast={podcast} showLabel />
              <Button variant="outline" onClick={handleBookmark}>
                <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                {isBookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => handleShare(podcast.link, podcast.title)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Episode Description</h2>
              <div className="prose prose-sm dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: sanitizeReaderContent(podcast.content || podcast.description || '') }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
