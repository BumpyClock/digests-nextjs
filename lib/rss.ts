import type {
  Feed,
  FeedItem,
  FetchFeedsResponse,
  ReaderViewResponse
} from '@/types'
import type { FeedFetcherConfig } from './interfaces/feed-fetcher.interface'
import { getApiUrl } from '@/lib/config'
import { Logger } from '@/utils/logger'
import { transformFeedResponse } from '@/lib/feed-transformer'

/**
 * Fetches feeds from the API
 * @param urls - Array of feed URLs to fetch
 * @param config - Optional configuration for API base URL
 * @returns Promise with feeds and items
 */
export async function fetchFeeds(
  urls: string[],
  config?: FeedFetcherConfig
): Promise<{ feeds: Feed[]; items: FeedItem[] }> {
  try {
    Logger.debug(`Fetching feeds for URLs: ${urls.length}`)
    Logger.debug('Feed URLs', urls)

    // Use custom API URL if provided, otherwise use default
    const apiUrl = config?.apiBaseUrl
      ? `${config.apiBaseUrl}/parse`
      : getApiUrl("/parse");

    const response = await fetch(apiUrl, {
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

/**
 * Fetches reader view data from the API
 * @param urls - Array of article URLs to fetch
 * @param config - Optional configuration for API base URL
 * @returns Promise with reader view responses
 */
export async function fetchReaderView(
  urls: string[],
  config?: FeedFetcherConfig
): Promise<ReaderViewResponse[]> {
  try {
    Logger.debug("Fetching reader view for URLs:", urls)

    // Use custom API URL if provided, otherwise use default
    const apiUrl = config?.apiBaseUrl
      ? `${config.apiBaseUrl}/getreaderview`
      : getApiUrl("/getreaderview");

    const response = await fetch(apiUrl, {
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

