import type {
  Feed,
  FeedItem,
  FetchFeedsResponse,
  ReaderViewResponse
} from '@/types'
import { getApiUrl } from '@/lib/config'
import { Logger } from '@/utils/logger'
import { transformFeedResponse } from '@/lib/feed-transformer'

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

    return transformFeedResponse(data)
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

