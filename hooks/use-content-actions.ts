import { toggleFavoriteAction } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { handleShare as handleShareUtil } from "@/utils/content-actions"

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

    // Use shared utility for consistent share behavior
    await handleShareUtil(
      url,
      title || `Share ${contentType}`,
      `Check out this ${contentType}`,
      contentType
    )
  }

  return {
    handleBookmark,
    handleShare,
  }
}
