import { useCallback } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"

export function useFeedManagement() {
  const { removeFeed } = useFeedStore()


  const handleRemoveFeed = useCallback((feedUrl: string) => {
    removeFeed(feedUrl)
    toast.success("Feed removed", {
      description: "The feed has been removed from your subscriptions.",
    })
  }, [removeFeed, toast])

  const handleCopyFeed = useCallback((feedUrl: string) => {
    navigator.clipboard.writeText(feedUrl)
    toast.success("Feed URL copied", {
      description: "The feed URL has been copied to your clipboard.",
    })
  }, [toast])

  return {
    handleRemoveFeed,
    handleCopyFeed,
  }
} 