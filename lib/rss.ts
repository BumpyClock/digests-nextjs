import type { 
  Feed, 
  FeedItem, 
  FetchFeedsResponse, 
  ReaderViewResponse 
} from '@/types'
import { getApiUrl } from '@/lib/config'
import { Logger } from '@/utils/logger'

// Re-export types for external usage
export type { Feed, FeedItem, FetchFeedsResponse, ReaderViewResponse }

export async function fetchFeeds(urls: string[]): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  try {
    Logger.debug(`Fetching feeds for URLs: ${urls.length}`)
    Logger.debug('Feed URLs', urls)
    const response = await fetch(getApiUrl("/parse"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    })

    Logger.debug("API Response status:", response.status)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as FetchFeedsResponse
    Logger.debug("API Response data:", JSON.stringify(data, null, 2))

    if (!data || !Array.isArray(data.feeds)) {
      throw new Error("Invalid response from API")
    }

    const feeds: Feed[] = data.feeds.map((feed: Feed) => ({
      type: feed.type,
      guid: feed.guid || feed.link?.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID(),
      status: feed.status,
      siteTitle: feed.siteTitle,
      feedTitle: feed.feedTitle,
      feedUrl: feed.feedUrl,
      description: feed.description,
      link: feed.link,
      lastUpdated: feed.lastUpdated,
      lastRefreshed: feed.lastRefreshed,
      published: feed.published,
      author: feed.author,
      language: feed.language,
      favicon: feed.favicon,
      categories: feed.categories,
      items: Array.isArray(feed.items) ? feed.items.map((item: FeedItem) => ({
        type: item.type,
        id: item.id || item.link?.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID(),
        title: item.title,
        description: item.description,
        link: item.link,
        author: item.author,
        published: item.published,
        content: item.content,
        created: item.created,
        content_encoded: item.content_encoded,
        categories: item.categories,
        enclosures: item.enclosures,
        thumbnail: item.thumbnail,
        thumbnailColor: item.thumbnailColor,
        thumbnailColorComputed: item.thumbnailColorComputed,
        siteTitle: feed.siteTitle,
        feedTitle: feed.feedTitle,
        feedUrl: feed.feedUrl,
        favicon: feed.favicon,
        favorite: false,
      })) : [],
    }))

    const items: FeedItem[] = feeds
      .flatMap(feed => feed.items || [])


    return { feeds, items }
  } catch (error) {
    console.error("Error fetching feeds:", error)
    throw error
  }
}

export async function fetchReaderView(urls: string[]): Promise<ReaderViewResponse[]> {
  try {
    Logger.debug("Fetching reader view for URLs:", urls)
    const response = await fetch(getApiUrl("/getreaderview"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    })

    Logger.debug("API Response status:", response.status)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    Logger.debug("API Response data:", JSON.stringify(data, null, 2))

    if (!Array.isArray(data)) {
      throw new Error("Invalid response from API")
    }

    return data as ReaderViewResponse[]
  } catch (error) {
    console.error("Error fetching reader view:", error)
    throw error
  }
}

