/**
 * Core feed and feed item types for the RSS reader
 */

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
  
  export interface Enclosure {
    url: string
    type: string
    length?: string
  }