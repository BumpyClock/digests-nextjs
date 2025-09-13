"use client"

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Bookmark, Share2, ExternalLink } from "lucide-react"
import { toggleFavoriteAction } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { FeedItem } from "@/types"
import { useFeedsData, useReaderViewQuery } from "@/hooks/queries"
import { sanitizeReaderContent } from "@/utils/htmlSanitizer"

export default function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [article, setArticle] = useState<FeedItem | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  
  // Use React Query to get feeds data
  const feedsQuery = useFeedsData()
  
  // Find the article from feeds data
  const foundArticle = feedsQuery.data?.items?.find((item: FeedItem) => item.id === params.id && item.type === "article")
  
  // Use React Query to get reader view data
  const readerViewQuery = useReaderViewQuery(foundArticle?.link || "")

  useEffect(() => {
    if (foundArticle) {
      setArticle(foundArticle)
      setIsBookmarked(foundArticle.favorite || false)
    }
  }, [foundArticle])

  const handleBookmark = async () => {
    if (!article) return

    // Optimistic update
    setIsBookmarked(!isBookmarked)

    const result = await toggleFavoriteAction(article.id)

    if (result.success) {
      toast({
        title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        description: isBookmarked
          ? "This article has been removed from your bookmarks."
          : "This article has been added to your bookmarks.",
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
      description: "The link to this article has been copied to your clipboard.",
    })
  }

  if (feedsQuery.isLoading || readerViewQuery.isLoading) {
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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container max-w-3xl py-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-2">Article not found</h2>
          <p className="text-muted-foreground mb-6">
            The article you&apos;re looking for doesn&apos;t exist or has been removed.
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
            <Button variant="ghost" size="icon" onClick={handleShare}>
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

