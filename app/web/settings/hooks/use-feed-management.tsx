import { useCallback } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { useToast } from "@/hooks/use-toast"
import { createToast, TOAST_MESSAGES } from "../utils/toast-utils"

export function useFeedManagement() {
  const { removeFeed } = useFeedStore()
  const { toast } = useToast()

  const handleRemoveFeed = useCallback((feedUrl: string) => {
    removeFeed(feedUrl)
    createToast(toast, {
      title: TOAST_MESSAGES.FEED_REMOVED,
      value: "The feed has been removed from your subscriptions.",
    })
  }, [removeFeed, toast])

  const handleCopyFeed = useCallback((feedUrl: string) => {
    navigator.clipboard.writeText(feedUrl)
    createToast(toast, {
      title: TOAST_MESSAGES.URL_COPIED,
      value: "The feed URL has been copied to your clipboard.",
    })
  }, [toast])

  return {
    handleRemoveFeed,
    handleCopyFeed,
  }
} 