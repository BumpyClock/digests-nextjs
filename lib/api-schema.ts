// Import types from canonical source
import type { Feed, FeedItem, Enclosure } from '@/types/feed';

export interface FetchFeedsResponse {
  feeds: Feed[]
  items?: FeedItem[]
}

// API Response for fetching reader view
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
  author?: string
  error?: string
}

// Re-export types for convenience (types are defined in @/types/feed)
export type { Feed, FeedItem, Enclosure };

// API Request for fetching feeds
export interface FetchFeedsRequest {
  urls: string[]
}

// API Request for fetching reader view
export interface FetchReaderViewRequest {
  urls: string[]
}

// API Response for adding a new feed
export interface AddFeedResponse {
  success: boolean
  message: string
  feed?: Feed
  items?: FeedItem[]
}

// API Request for adding a new feed
export interface AddFeedRequest {
  url: string
}

// API Response for toggling favorite status
export interface ToggleFavoriteResponse {
  success: boolean
  message: string
  item?: FeedItem
}

// API Request for toggling favorite status
export interface ToggleFavoriteRequest {
  itemId: string
}

