"use client";

import { Bookmark, ExternalLink, Share2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

interface ArticleActionsProps {
  /** The article/feed item */
  item: {
    link: string;
  };
  /** Whether the item is in read later list */
  isInReadLater: boolean;
  /** Callback when read later is toggled */
  onReadLaterToggle: () => void;
  /** Optional className for styling */
  className?: string;
  /** Layout variant */
  layout?: "standard" | "compact" | "modal";
  /** Share callback */
  onShare: () => void;
}

/**
 * Action buttons for articles (share, bookmark, external link)
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleActions: React.FC<ArticleActionsProps> = ({
  item,
  isInReadLater,
  onReadLaterToggle,
  onShare,
  className = "",
  layout = "standard",
}) => {
  const onReadLaterClick = () => {
    onReadLaterToggle();
  };

  const isCompact = layout === "compact";

  if (isCompact) {
    // Icon-only compact layout
    return (
      <div className={`flex gap-1 ${className}`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={onReadLaterClick}
          className="h-8 w-8"
          aria-label={isInReadLater ? "Remove from read later" : "Add to read later"}
        >
          <Bookmark className={`h-4 w-4 ${isInReadLater ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onShare}
          className="h-8 w-8"
          aria-label="Share article"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" asChild className="h-8 w-8">
          <a
            href={item.link}
            title="Open in new tab"
            aria-label="Open in new tab"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  // Standard layout with text labels
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={onReadLaterClick}
        aria-label={isInReadLater ? "Remove from read later" : "Add to read later"}
      >
        <Bookmark className={`h-4 w-4 mr-1 ${isInReadLater ? "fill-red-500 text-red-500" : ""}`} />
        {isInReadLater ? "Saved" : "Read Later"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onShare} aria-label="Share article">
        <Share2 className="h-4 w-4 mr-1" />
        Share
      </Button>
      <Button size="sm" variant="ghost" asChild>
        <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab">
          <ExternalLink className="h-4 w-4 mr-1" />
          Open
        </a>
      </Button>
    </div>
  );
};
