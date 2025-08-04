"use client";

import React from "react";
import { FeedItem } from "@/types";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { useReaderView } from "@/hooks/use-reader-view";

interface ArticleReaderProps {
  item: FeedItem;
  initialContent?: string | null;
  onFetchComplete?: (content: string | null) => void;
}

export function ArticleReader({
  item,
  initialContent,
  onFetchComplete,
}: ArticleReaderProps) {
  const {
    readerView,
    loading,
    cleanedContent,
    cleanedMarkdown,
    extractedAuthor,
  } = useReaderView(item);

  React.useEffect(() => {
    if (readerView && onFetchComplete) {
      onFetchComplete({
        title: readerView.title,
        content: readerView.content,
        author: extractedAuthor?.name,
        date: item.published,
        url: readerView.url,
      });
    }
  }, [readerView, onFetchComplete, extractedAuthor, item.published]);

  if (loading && !initialContent) {
    return <div data-testid="article-skeleton">Loading...</div>;
  }

  return (
    <ReaderContent
      feedItem={item}
      readerView={
        initialContent && readerView
          ? {
              ...readerView,
              title: initialContent.title || readerView.title,
              content: initialContent.content || readerView.content,
            }
          : readerView
      }
      loading={loading}
      cleanedContent={initialContent?.content || cleanedContent}
      cleanedMarkdown={cleanedMarkdown}
      extractedAuthor={extractedAuthor}
    />
  );
}
