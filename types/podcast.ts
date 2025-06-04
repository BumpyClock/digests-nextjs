import type { FeedItem } from "./feed"

/**
 * Type guard to check if a FeedItem is a podcast
 */
export function isPodcast(item: FeedItem): item is FeedItem & { type: "podcast" } {
  return item.type === "podcast"
}

/**
 * Get the audio URL from a podcast item
 */
export function getPodcastAudioUrl(item: FeedItem): string | undefined {
  if (!isPodcast(item)) {
    return undefined
  }
  
  // Check for enclosures (standard podcast format)
  const audioUrl = item.enclosures?.[0]?.url
  
  if (!audioUrl) {
    console.warn(`Podcast item "${item.title}" has no audio URL`)
    return undefined
  }
  
  return audioUrl
}

/**
 * Validate if a podcast item has all required data for playback
 */
export function isValidPodcast(item: FeedItem): boolean {
  return isPodcast(item) && !!getPodcastAudioUrl(item)
}

/**
 * Get podcast duration in seconds
 */
export function getPodcastDuration(item: FeedItem): number | undefined {
  if (!isPodcast(item)) {
    return undefined
  }
  
  // Check multiple possible duration sources
  if (item.duration) {
    return Number(item.duration)
  }
  
  if (item.enclosures?.[0]?.length) {
    return Number(item.enclosures[0].length)
  }
  
  return undefined
}