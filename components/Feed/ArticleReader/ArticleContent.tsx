"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import React, { memo, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/motion-tokens";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";

function ArticleContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <div className="my-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-2" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

const ArticleMarkdownRenderer = dynamic(() => import("./ArticleMarkdownRenderer"), {
  ssr: false,
  loading: () => <ArticleContentSkeleton />,
});

interface ArticleContentProps {
  /** HTML content */
  content: string;
  /** Markdown content (preferred) */
  markdown?: string;
  /** Optional className */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Disable mount entrance animation for native View Transition paths */
  disableEntranceAnimation?: boolean;
}

/**
 * Renders article content with markdown support
 * Handles both HTML content and markdown
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleContent = memo<ArticleContentProps>(
  ({ content, markdown, className, loading = false, disableEntranceAnimation = false }) => {
    // Sanitize HTML once per content change to avoid heavy work on re-renders
    const sanitizedHtml = useMemo(() => {
      return sanitizeReaderContent(content);
    }, [content]);

    if (loading) {
      return (
        <div
          className={`prose prose-amber text-body prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-primary-content px-6 md:px-8 lg:px-12 ${
            className || "w-full md:max-w-4xl"
          }`}
        >
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />

            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />

            {/* Simulated image in content */}
            <div className="my-8">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />

            <div className="my-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-5/6 mt-2" />
            </div>

            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      );
    }

    // Prefer markdown if available, fallback to HTML content
    const shouldUseMarkdown = markdown && markdown.trim() !== "";
    const contentClassName = `prose prose-amber text-body prose-lg dark:prose-invert reader-view-article mb-24 m-auto bg-background text-primary-content px-6 md:px-8 lg:px-12 ${
      className || "w-full md:max-w-4xl"
    }`;
    const renderedContent = shouldUseMarkdown ? (
      <ArticleMarkdownRenderer content={markdown} />
    ) : (
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    );

    if (disableEntranceAnimation) {
      return <div className={contentClassName}>{renderedContent}</div>;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.slow, delay: motionTokens.duration.normal }}
        className={contentClassName}
      >
        {renderedContent}
      </motion.div>
    );
  }
);

ArticleContent.displayName = "ArticleContent";
