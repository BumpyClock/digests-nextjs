import type { FeedItem } from "@/types"

/**
 * Parses podcast duration from various formats (number or time string)
 * Supports: numeric seconds, "ss", "mm:ss", and "hh:mm:ss" formats
 * @param podcast - The podcast feed item
 * @returns Duration in seconds or undefined if not available
 */
export function parsePodcastDuration(podcast: FeedItem): number | undefined {
  // Return number durations as-is
  if (typeof podcast.duration === 'number') {
    return podcast.duration
  }

  // Parse string duration
  if (typeof podcast.duration === 'string') {
    const trimmed = podcast.duration.trim()

    // Try to parse as plain number first
    const asNumber = Number(trimmed)
    if (!isNaN(asNumber) && isFinite(asNumber)) {
      return asNumber
    }

    // Parse time format (ss, mm:ss, or hh:mm:ss)
    const parts = trimmed.split(':')
    if (parts.length === 0 || parts.length > 3) {
      return undefined
    }

    // Parse from right to left: [hours, ]minutes, seconds
    let totalSeconds = 0
    const segments = parts.reverse()

    for (let i = 0; i < segments.length; i++) {
      const value = parseInt(segments[i], 10)
      if (isNaN(value) || value < 0) {
        return undefined
      }

      // i=0: seconds, i=1: minutes, i=2: hours
      totalSeconds += value * Math.pow(60, i)
    }

    return totalSeconds
  }

  return undefined
}
