"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { memo, useMemo } from "react";

dayjs.extend(relativeTime);

interface ArticleMetadataProps {
  /** Author information */
  author?: {
    name: string;
    image?: string;
  };
  /** Publication date */
  published?: string;
  /** Content for reading time calculation (HTML) */
  content?: string;
  /** Markdown content (preferred for word count) */
  markdown?: string;
  /** Layout variant */
  layout?: "standard" | "compact" | "modal";
  /** Optional className */
  className?: string;
}

/**
 * Calculates reading time from content
 * @param content - HTML or markdown content
 * @returns Reading time string
 */
function calculateReadingTime(content: string): string {
  if (!content) return "Reading time N/A";

  // Remove HTML tags and markdown formatting for accurate word count
  // Order matters: remove images/links BEFORE removing brackets
  const cleanText = content
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove markdown images FIRST
    .replace(/\[.*?\]\(.*?\)/g, "") // Remove markdown links SECOND
    .replace(/[#*_`~[\]()]/g, "") // Then remove remaining markdown characters
    .trim();

  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.round(wordCount / 225); // 225 words per minute

  return readingTimeMinutes < 1 ? "Less than a minute read" : `${readingTimeMinutes} minute read`;
}

/**
 * Displays article metadata (author, date, reading time)
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleMetadata = memo<ArticleMetadataProps>(
  ({ author, published, content, markdown, layout = "standard", className = "" }) => {
    const readingTime = useMemo(() => {
      const textToAnalyze = markdown || content;
      return textToAnalyze ? calculateReadingTime(textToAnalyze) : "Reading time N/A";
    }, [content, markdown]);

    const publishedDate = published ? dayjs(published).fromNow() : null;
    const isCompact = layout === "compact";

    return (
      <div className={`${className}`}>
        {/* Reading Time */}
        <div className="text-secondary-content text-fluid-xs mb-1">
          <span>{readingTime}</span>
        </div>

        {/* Author & Date - Only show if author info is available */}
        {author && (
          <div className="flex items-center gap-3 mt-2">
            {author.image && (
              <Image
                src={author.image}
                alt={author.name}
                width={32}
                height={32}
                className="rounded-full w-8 h-8 object-cover"
                loading="lazy"
              />
            )}
            <div className="flex flex-col">
              <span
                className={`text-primary-content ${isCompact ? "text-subtitle" : "text-title"}`}
              >
                {author.name}
              </span>
              {publishedDate && (
                <span
                  className={`text-secondary-content ${isCompact ? "text-caption" : "text-body-small"}`}
                >
                  {publishedDate}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ArticleMetadata.displayName = "ArticleMetadata";
