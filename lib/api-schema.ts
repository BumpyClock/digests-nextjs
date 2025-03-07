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
}

// Feed schema
export interface Feed {
  type: string
  guid: string
  status: string
  siteTitle: string
  feedTitle: string
  feedUrl: string
  description: string
  link: string
  lastUpdated: string
  lastRefreshed: string
  published: string
  author: string | null
  language: string
  favicon: string
  categories: string
  items?: FeedItem[]
}

// FeedItem schema
export interface FeedItem {
  type: string
  id: string
  title: string
  description: string
  link: string
  author: string
  published: string
  content: string
  created: string
  content_encoded: string
  categories: string
  enclosures: Enclosure[] | null
  thumbnail: string
  thumbnailColor: {
    r: number
    g: number
    b: number
  }
  thumbnailColorComputed: string
  siteTitle: string
  feedTitle: string
  feedUrl: string
  favicon: string
  favorite?: boolean
  duration?: number
  // Additional fields for podcasts
  itunesEpisode?: string
  itunesSeason?: string
  feedImage?: string
}

// Enclosure schema (for podcast audio files)
export interface Enclosure {
  url: string
  type: string
  length?: string
}

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

