import { normalizeUrl } from "@/utils/url";

/**
 * Creates a stable, sorted key from a list of URLs
 * Normalizes, trims, deduplicates, and sorts URLs for consistent caching
 */
export function stableKey(urls: string[]): string {
  return Array.from(new Set(urls.map((u) => normalizeUrl(u)).filter(Boolean)))
    .sort()
    .join("|");
}
