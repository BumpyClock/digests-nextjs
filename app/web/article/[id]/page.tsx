"use client"

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bookmark, Share2, ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { FeedItem } from "@/types"
import { useFeedsData, useReaderViewQuery } from "@/hooks/queries"
import { refreshFeedsAction } from "@/app/actions"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton"
import { ContentNotFound } from "@/components/ContentNotFound"
import { useContentActions } from "@/hooks/use-content-actions"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"

export default function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("article")

  // Use React Query to get feeds data
  const feedsQuery = useFeedsData()

  // Fallback state for cold-start navigation (when item not in React Query cache)
  const [fallbackArticle, setFallbackArticle] = useState<FeedItem | null>(null)
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [fallbackAttempted, setFallbackAttempted] = useState(false)

  // Find the article from feeds data (single source of truth)
  const cachedArticle = feedsQuery.data?.items?.find((item: FeedItem) => item.id === params.id && item.type === "article")

  // Use cached article if available, otherwise use fallback
  const article = cachedArticle || fallbackArticle

  // Use React Query to get reader view data
  const readerViewQuery = useReaderViewQuery(article?.link || "")

  // Derive bookmark state directly from React Query data
  // Local state is only for optimistic UI updates
  const [optimisticBookmark, setOptimisticBookmark] = useState<boolean | null>(null)
  const isBookmarked = optimisticBookmark ?? (article?.favorite || false)

  // Get subscriptions from store for fallback fetch
  const subscriptions = useFeedStore((state) => state.subscriptions)

  // Fallback fetch when item not in cache (e.g., cold-start direct navigation)
  useEffect(() => {
    async function fetchFallback() {
      if (!params.id || cachedArticle || fallbackAttempted || feedsQuery.isLoading) return

      // Wait for subscriptions to be available (store hydration)
      if (!subscriptions || subscriptions.length === 0) return

      setFallbackLoading(true)
      setFallbackAttempted(true)

      try {
        // Fetch all subscribed feeds to find the article
        const feedUrls = subscriptions.map((sub) => sub.feedUrl)
        const result = await refreshFeedsAction(feedUrls)

        if (!result.success) {
          console.error('Failed to fetch feeds for article:', result.message)
          toast.error('Failed to load article', {
            description: result.message || 'Could not fetch article data. Please try again.',
          })
          return
        }

        if (result.items) {
          const foundArticle = result.items.find((item: FeedItem) => item.id === params.id && item.type === "article")
          if (foundArticle) {
            setFallbackArticle(foundArticle)
          } else {
            console.warn('Article not found in fetched feeds:', params.id)
          }
        }
      } catch (error) {
        console.error('Exception during fallback fetch:', error)
        toast.error('Network error', {
          description: 'Failed to load article. Please check your connection and try again.',
        })
      } finally {
        setFallbackLoading(false)
      }
    }

    fetchFallback()
  }, [params.id, cachedArticle, fallbackAttempted, feedsQuery.isLoading, subscriptions])

  const handleBookmark = async () => {
    if (!article) return
    try {
      await bookmarkAction(article.id, isBookmarked, setOptimisticBookmark)
    } finally {
      // Clear optimistic state so React Query becomes source of truth
      setOptimisticBookmark(null)
    }
  }

  if (feedsQuery.isLoading || readerViewQuery.isLoading || fallbackLoading) {
    return <ContentPageSkeleton />
  }

  if (!article) {
    return <ContentNotFound contentType="Article" />
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-4">{readerViewQuery.data?.title || article.title}</h1>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {readerViewQuery.data?.favicon && (
              <Image
                src={readerViewQuery.data.favicon || "/placeholder-rss.svg"}
                alt="Site favicon"
                width={24}
                height={24}
                className="rounded"
              />
            )}
            <div>
              <p className="font-medium">{readerViewQuery.data?.siteName || article.link}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(article.published).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={handleBookmark}>
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
              <span className="sr-only">Bookmark</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleShare(article.link, article.title)}>
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share</span>
            </Button>
            <Link href={article.link || "#"} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open original</span>
              </Button>
            </Link>
          </div>
        </div>

        {readerViewQuery.data?.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-6">
            <Image
              src={readerViewQuery.data.image || "/placeholder-rss.svg"}
              alt={readerViewQuery.data.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="prose prose-sm sm:prose dark:prose-invert w-full md:max-w-4xl">
          {readerViewQuery.data ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeReaderContent(readerViewQuery.data.content) }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: sanitizeReaderContent(article.content || article.description || '') }} />
          )}
        </div>
      </div>
    </div>
  )
}
