import type { FeedItem } from "./feed";

/**
 * Type guard to check if a FeedItem is a podcast
 */
export function isPodcast(item: FeedItem): item is FeedItem & { type: "podcast" } {
  return item.type === "podcast";
}

/**
 * Get the audio URL from a podcast item
 */
export function getPodcastAudioUrl(item: FeedItem): string | undefined {
  if (!isPodcast(item)) {
    return undefined;
  }

  // Check for enclosures (standard podcast format)
  const audioUrl = item.enclosures?.[0]?.url;

  if (!audioUrl) {
    console.warn(`Podcast item "${item.title}" has no audio URL`);
    return undefined;
  }

  return audioUrl;
}

