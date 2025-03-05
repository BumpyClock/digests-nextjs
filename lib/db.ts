import type { Feed, FeedItem } from "./rss"
import { saveFeeds, getFeeds, saveFeedItems, getFeedItems } from "./localStorage"

export async function initDb(): Promise<void> {
  // No need to initialize anything for local storage
}

export async function getStoredFeeds(): Promise<Feed[]> {
  console.log("Retrieving stored feeds:", getFeeds())
  return getFeeds()
}

export async function getStoredFeedItems(): Promise<FeedItem[]> {
  console.log("Retrieving stored feed items:", getFeedItems())
  return getFeedItems()
}

export async function addFeeds(feeds: Feed[]): Promise<Feed[]> {
  const storedFeeds = getFeeds()
  const updatedFeeds = [...storedFeeds]

  feeds.forEach((feed) => {
    const existingFeedIndex = updatedFeeds.findIndex((f) => f.feedUrl === feed.feedUrl)
    if (existingFeedIndex !== -1) {
      updatedFeeds[existingFeedIndex] = feed
    } else {
      updatedFeeds.push(feed)
    }
  })

  console.log("Adding feeds:", updatedFeeds)
  saveFeeds(updatedFeeds)
  return updatedFeeds
}

export async function addFeedItems(newItems: FeedItem[]): Promise<FeedItem[]> {
  const existingItems = getFeedItems()
  const existingItemsMap = new Map(existingItems.map((item) => [item.id, item]))

  newItems.forEach((item) => {
    existingItemsMap.set(item.id, item)
  })

  const updatedItems = Array.from(existingItemsMap.values())
  console.log("Adding feed items:", updatedItems)
  saveFeedItems(updatedItems)
  return updatedItems
}

export async function removeFeed(feedUrl: string): Promise<void> {
  const feeds = getFeeds()
  const updatedFeeds = feeds.filter((feed) => feed.feedUrl !== feedUrl)
  saveFeeds(updatedFeeds)

  const items = getFeedItems()
  const updatedItems = items.filter((item) => item.feedUrl !== feedUrl)
  saveFeedItems(updatedItems)
}

export async function toggleFavorite(itemId: string): Promise<FeedItem | null> {
  const items = getFeedItems()
  const itemIndex = items.findIndex((item) => item.id === itemId)

  if (itemIndex === -1) {
    return null
  }

  items[itemIndex].favorite = !items[itemIndex].favorite
  saveFeedItems(items)

  return items[itemIndex]
}

