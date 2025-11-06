"use client";

import React from "react";
import { Share2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ArticleActionsProps {
  /** The article/feed item */
  item: {
    id: string;
    title: string;
    description?: string;
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
}

/**
 * Action buttons for articles (share, bookmark, external link)
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleActions: React.FC<ArticleActionsProps> = ({
  item,
  isInReadLater,
  onReadLaterToggle,
  className = "",
  layout = "standard",
}) => {
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: item.link,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(item.link);
        toast("Share link copied", {
          description: "The link to this article has been copied to your clipboard.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Error sharing", {
          description: "Failed to share the article. Please try again.",
        });
      }
    }
  };

  const handleReadLater = () => {
    onReadLaterToggle();
    const message = isInReadLater ? "Removed from Read Later" : "Added to Read Later";
    const description = isInReadLater
      ? "The article has been removed from your reading list."
      : "The article has been added to your reading list.";
    toast(message, { description });
  };

  const isCompact = layout === "compact";

  if (isCompact) {
    // Icon-only compact layout
    return (
      <div className={`flex gap-1 ${className}`}>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleReadLater}
          className="h-8 w-8"
          aria-label={isInReadLater ? "Remove from read later" : "Add to read later"}
        >
          <Bookmark
            className={`h-4 w-4 ${isInReadLater ? "fill-red-500 text-red-500" : ""}`}
          />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleShare}
          className="h-8 w-8"
          aria-label="Share article"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          asChild
          className="h-8 w-8"
        >
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
        onClick={handleReadLater}
        aria-label={isInReadLater ? "Remove from read later" : "Add to read later"}
      >
        <Bookmark
          className={`h-4 w-4 mr-1 ${isInReadLater ? "fill-red-500 text-red-500" : ""}`}
        />
        {isInReadLater ? "Read Later" : "Read Later"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleShare}
        aria-label="Share article"
      >
        <Share2 className="h-4 w-4 mr-1" />
        Share
      </Button>
      <Button
        size="sm"
        variant="ghost"
        asChild
      >
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in new tab"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Open
        </a>
      </Button>
    </div>
  );
};
