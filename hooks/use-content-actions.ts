import { useState } from "react"
import { toggleFavoriteAction } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"

/**
 * Shared hook for bookmark and share functionality
 * Used by article and podcast detail pages
 */
export function useContentActions(contentType: "article" | "podcast") {
  const { toast } = useToast()

  const handleBookmark = async (
    itemId: string,
    isBookmarked: boolean,
    setIsBookmarked: (value: boolean) => void
  ) => {
    // Optimistic update
    setIsBookmarked(!isBookmarked)

    const result = await toggleFavoriteAction(itemId)

    if (result.success) {
      toast({
        title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        description: isBookmarked
          ? `This ${contentType} has been removed from your bookmarks.`
          : `This ${contentType} has been added to your bookmarks.`,
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

  const handleShare = async (url?: string, title?: string) => {
    if (!url) {
      toast({
        title: "Error",
        description: "No URL available to share",
        variant: "destructive",
      })
      return
    }

    try {
      // Try native Web Share API first
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: title || `Share ${contentType}`,
          text: `Check out this ${contentType}`,
          url: url,
        })
        toast({
          title: "Link shared",
          description: `The ${contentType} has been shared successfully.`,
        })
      } else {
        // Fallback to clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url)
          toast({
            title: "Share link copied",
            description: `The link to this ${contentType} has been copied to your clipboard.`,
          })
        } else {
          throw new Error('Sharing not supported')
        }
      }
    } catch (error) {
      // Only show error if it's not an AbortError (user cancelled share)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: "Error",
          description: `Failed to share the ${contentType}. Please try again.`,
          variant: "destructive",
        })
      }
    }
  }

  return {
    handleBookmark,
    handleShare,
  }
}
