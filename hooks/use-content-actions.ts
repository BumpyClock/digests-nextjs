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

  const handleShare = () => {
    // In a real app, this would use the Web Share API
    toast({
      title: "Share link copied",
      description: `The link to this ${contentType} has been copied to your clipboard.`,
    })
  }

  return {
    handleBookmark,
    handleShare,
  }
}
