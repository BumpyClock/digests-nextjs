import type { Feed, FeedItem } from "./rss"

const FEEDS_STORAGE_KEY = "rss_reader_feeds"
const ITEMS_STORAGE_KEY = "rss_reader_items"

export function saveFeeds(feeds: Feed[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds))
      console.log("Saved feeds to localStorage:", feeds)
    } catch (error) {
      console.error("Error saving feeds to localStorage:", error)
    }
  }
}

export function getFeeds(): Feed[] {
  if (typeof window !== "undefined") {
    try {
      const feedsJson = localStorage.getItem(FEEDS_STORAGE_KEY)
      const feeds = feedsJson ? JSON.parse(feedsJson) : []
      console.log("Retrieved feeds from localStorage:", feeds)
      return feeds
    } catch (error) {
      console.error("Error retrieving feeds from localStorage:", error)
      return []
    }
  }
  return []
}

export function saveFeedItems(items: FeedItem[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items))
      console.log("Saved feed items to localStorage:", items)
    } catch (error) {
      console.error("Error saving feed items to localStorage:", error)
    }
  }
}

export function getFeedItems(): FeedItem[] {
  if (typeof window !== "undefined") {
    try {
      const itemsJson = localStorage.getItem(ITEMS_STORAGE_KEY)
      const items = itemsJson ? JSON.parse(itemsJson) : []
      console.log("Retrieved feed items from localStorage:", items)
      return items
    } catch (error) {
      console.error("Error retrieving feed items from localStorage:", error)
      return []
    }
  }
  return []
}

