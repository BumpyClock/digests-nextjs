"use client"

import { useState, useCallback, useEffect } from "react"
import { fetchFeedsAction, refreshFeedsAction } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import type { FeedItem, Feed } from "@/lib/rss"
import { saveFeeds, saveFeedItems, getFeeds, getFeedItems } from "@/lib/clientStorage"

export function useFeedManagement() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Helper function to sort feed items by published date
  const sortFeedItemsByDate = (items: FeedItem[]): FeedItem[] => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.published).getTime()
      const dateB = new Date(b.published).getTime()
      // Sort in descending order (newest first)
      return dateB - dateA
    })
  }

  const loadFeeds = useCallback(async () => {
    setLoading(true)
    try {
      const storedFeeds = getFeeds()
      const storedItems = getFeedItems()

      setFeeds(storedFeeds)
      // Sort items by published date before setting state
      setFeedItems(sortFeedItemsByDate(storedItems))

      console.log("Loaded feeds:", storedFeeds)
      console.log("Loaded feed items:", storedItems)
    } catch (error) {
      console.error("Error loading feeds:", error)
      toast({
        title: "Error",
        description: "Failed to load feeds. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const addFeed = useCallback(
    async (url: string) => {
      const result = await fetchFeedsAction(url)

      if (result.success && result.feeds && result.items) {
        const updatedFeeds = [...feeds, ...result.feeds]
        // Combine existing items with new ones and sort by date
        const updatedItems = sortFeedItemsByDate([...feedItems, ...result.items])

        saveFeeds(updatedFeeds)
        saveFeedItems(updatedItems)

        setFeeds(updatedFeeds)
        setFeedItems(updatedItems)

        toast({
          title: "Feed added",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    },
    [feeds, feedItems, toast]
  )

  const refreshFeeds = useCallback(async () => {
    setRefreshing(true)

    const feedUrls = feeds.map((feed) => feed.feedUrl)
    const result = await refreshFeedsAction(feedUrls)

    if (result.success && result.feeds && result.items) {
      // Sort items by published date
      const sortedItems = sortFeedItemsByDate(result.items)
      
      saveFeeds(result.feeds)
      saveFeedItems(sortedItems)

      setFeeds(result.feeds)
      setFeedItems(sortedItems)

      toast({
        title: "Feeds refreshed",
        description: "Your feeds have been updated with the latest content.",
      })
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      })
    }

    setRefreshing(false)
  }, [feeds, toast])

  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  return { feeds: feedItems, loading, refreshing, addFeed, refreshFeeds, setFeeds: setFeedItems }
}