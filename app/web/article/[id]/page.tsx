"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, Share2, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FeedItem } from "@/types";
import { useFeedsData, useReaderViewQuery } from "@/hooks/queries";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton";
import { ContentNotFound } from "@/components/ContentNotFound";
import { useContentActions } from "@/hooks/use-content-actions";

export default function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [article, setArticle] = useState<FeedItem | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const router = useRouter();
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("article");

  // Use React Query to get feeds data
  const feedsQuery = useFeedsData();

  // Find the article from feeds data
  const foundArticle = feedsQuery.data?.items?.find(
    (item: FeedItem) => item.id === params.id && item.type === "article"
  );

  // Use React Query to get reader view data
  const readerViewQuery = useReaderViewQuery(foundArticle?.link || "");

  useEffect(() => {
    if (foundArticle) {
      setArticle(foundArticle);
      setIsBookmarked(foundArticle.favorite || false);
    }
  }, [foundArticle]);

  const handleBookmark = async () => {
    if (!article) return;
    await bookmarkAction(article.id, isBookmarked, setIsBookmarked);
  };

  if (feedsQuery.isLoading || readerViewQuery.isLoading) {
    return <ContentPageSkeleton />;
  }

  if (!article) {
    return <ContentNotFound contentType="Article" />;
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleShare(article.link, article.title)}
            >
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
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizeReaderContent(readerViewQuery.data.content),
              }}
            />
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html: sanitizeReaderContent(article.content || article.description || ""),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
