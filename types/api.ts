/**
 * API request and response types
 */

import type { Feed, FeedItem } from './feed'

export interface FetchFeedsResponse {
  feeds: Feed[]
  items?: FeedItem[]
  success: boolean
  message?: string
}

export interface ReaderViewResponse {
  url: string
  status: string
  content: string
  title: string
  siteName: string
  image: string
  favicon: string
  textContent: string
  markdown: string
  error?: string
}

export interface FetchFeedsRequest {
  urls: string[]
}

export interface FetchReaderViewRequest {
  urls: string[]
}

export interface AddFeedResponse {
  success: boolean
  message: string
  feed?: Feed
  items?: FeedItem[]
}

export interface AddFeedRequest {
  url: string
}

export interface ToggleFavoriteResponse {
  success: boolean
  message: string
  item?: FeedItem
}

export interface ToggleFavoriteRequest {
  itemId: string
}

export interface APIErrorResponse {
  success: false
  message: string
  code?: string
}