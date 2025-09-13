"use client"

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Bookmark, Share2 } from "lucide-react"
import { fetchFeedsAction, toggleFavoriteAction } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { useAudioActions } from "@/hooks/useFeedSelectors"
import Image from "next/image"
import type { FeedItem } from "@/types/feed"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"

export default function PodcastPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [podcast, setPodcast] = useState<FeedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { playAudio } = useAudioActions()

  useEffect(() => {
    async function loadPodcast() {
      setLoading(true)

      const { success, items } = await fetchFeedsAction(params.id)

      if (success && items) {
        const foundPodcast = items.find((item: FeedItem) => item.id === params.id && item.type === "podcast")

        if (foundPodcast) {
          setPodcast(foundPodcast)
          setIsBookmarked(foundPodcast.favorite || false)
        }
      }

      setLoading(false)
    }

    loadPodcast()
  }, [params.id])

  const handleBookmark = async () => {
    if (!podcast) return

    // Optimistic update
    setIsBookmarked(!isBookmarked)

    const result = await toggleFavoriteAction(podcast.id)

    if (result.success) {
      toast({
        title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        description: isBookmarked
          ? "This podcast has been removed from your bookmarks."
          : "This podcast has been added to your bookmarks.",
      })
    } else {
      // Revert optimistic update if failed
      setIsBookmarked(isBookmarked)

      toast({
        title: "Error",
        description: result.message || "Failed to update bookmark status",
        variant: "destructive",
      })
    }
  }

  const handleShare = () => {
    // In a real app, this would use the Web Share API
    toast({
      title: "Share link copied",
      description: "The link to this podcast has been copied to your clipboard.",
    })
  }

  const handlePlay = () => {
    if (podcast) {
      playAudio({
        id: podcast.id,
        title: podcast.title,
        source: podcast.link,
        audioUrl: podcast.link || "https://example.com/podcast.mp3",
        image: podcast.thumbnail,
      })
    }
  }

  if (loading) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="flex items-center space-x-4 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!podcast) {
    return (
      <div className="container max-w-3xl py-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-2">Podcast not found</h2>
          <p className="text-muted-foreground mb-6">
            The podcast you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push("/app")}>Return to feeds</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="relative w-full md:w-1/3 aspect-square overflow-hidden rounded-lg">
            <Image
              src={podcast.thumbnail || "/placeholder-podcast.svg"}
              alt={podcast.title}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{podcast.title}</h1>
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                {podcast.link.charAt(0).toUpperCase()}
              </div>
              <p className="font-medium">{podcast.link}</p>
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
              <Button onClick={handlePlay}>Play Episode</Button>
              <Button variant="outline" onClick={handleBookmark}>
                <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                {isBookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" onClick={handleShare}>
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

