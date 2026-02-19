"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, ExternalLink, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef } from "react";
import { ContentNotFound } from "@/components/ContentNotFound";
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton";
import { Button } from "@/components/ui/button";
import { useFeedsData, useReaderViewQuery } from "@/hooks/queries";
import { feedsKeys } from "@/hooks/queries/feedsKeys";
import { useContentActions } from "@/hooks/use-content-actions";
import { useToast } from "@/hooks/use-toast";
import { FeedItem } from "@/types";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";

function SanitizedHtmlContent({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    element.innerHTML = html;
  }, [html]);

  return <div ref={contentRef} />;
}

export default function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("article");
  const { toast } = useToast();

  // Use React Query to get feeds data
  const feedsQuery = useFeedsData();

  // Find the article from feeds data
  const foundArticle = feedsQuery.data?.items?.find(
    (item: FeedItem) => item.id === params.id && item.type === "article"
  );
  const isBookmarked = useMemo(() => Boolean(foundArticle?.favorite), [foundArticle?.favorite]);

  // Use React Query to get reader view data
  const readerViewQuery = useReaderViewQuery(foundArticle?.link || "");
  const sanitizedContent = useMemo(() => {
    const content =
      readerViewQuery.data?.content || foundArticle?.content || foundArticle?.description || "";
    return sanitizeReaderContent(content);
  }, [foundArticle?.content, foundArticle?.description, readerViewQuery.data?.content]);

  const handleBookmark = async () => {
    if (!foundArticle) {
      return;
    }

    try {
      await bookmarkAction(foundArticle.id, isBookmarked, () => {});
      await queryClient.invalidateQueries({ queryKey: feedsKeys.all });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to update article bookmark:", {
        error,
        errorMessage,
        articleId: foundArticle.id,
      });
      toast({
        title: "Error",
        description: errorMessage || "Failed to update bookmark status.",
        variant: "destructive",
      });
    }
  };

  if (feedsQuery.isLoading || readerViewQuery.isLoading) {
    return <ContentPageSkeleton />;
  }

  if (!foundArticle) {
    return <ContentNotFound contentType="Article" />;
  }

  const publishedDate = new Date(foundArticle.published);
  const publishedDisplay = Number.isNaN(publishedDate.getTime())
    ? "Unknown date"
    : publishedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="mb-4 text-display-small text-primary-content">
          {readerViewQuery.data?.title || foundArticle.title}
        </h1>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            {readerViewQuery.data?.favicon && (
              <Image
                src={readerViewQuery.data.favicon}
                alt="Site favicon"
                width={24}
                height={24}
                className="rounded"
              />
            )}
            <div>
              <p className="text-subtitle text-primary-content">
                {readerViewQuery.data?.siteName || foundArticle.link}
              </p>
              <p className="text-body-small text-secondary-content">{publishedDisplay}</p>
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
              onClick={() => handleShare(foundArticle.link, foundArticle.title)}
            >
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share</span>
            </Button>
            {foundArticle.link ? (
              <Link href={foundArticle.link} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Open original</span>
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="icon" disabled aria-disabled={true} tabIndex={-1}>
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open original unavailable</span>
              </Button>
            )}
          </div>
        </div>

        {readerViewQuery.data?.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-6">
            <Image
              src={readerViewQuery.data.image}
              alt={readerViewQuery.data.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        <div className="prose prose-sm sm:prose dark:prose-invert w-full md:max-w-4xl">
          <SanitizedHtmlContent html={sanitizedContent} />
        </div>
      </div>
    </div>
  );
}
