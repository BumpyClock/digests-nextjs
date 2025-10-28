import type { FeedItem } from "@/types"

/**
 * Parses podcast duration from various formats (number, string, or enclosure length)
 * @param podcast - The podcast feed item
 * @returns Duration in seconds or undefined if not available
 */
export function parsePodcastDuration(podcast: FeedItem): number | undefined {
  if (typeof podcast.duration === 'number') {
    return podcast.duration
  }

  const raw = (podcast.duration as unknown) ?? podcast.enclosures?.[0]?.length
  const n = typeof raw === 'string' ? parseInt(raw, 10) : (raw as number | undefined)
  return Number.isFinite(n as number) ? (n as number) : undefined
}
