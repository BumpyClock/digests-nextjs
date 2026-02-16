import { normalizeUrl } from "@/utils/url";

/**
 * Deterministic 32-bit string hash used across feed helpers.
 */
export function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Force 32-bit signed integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Creates a stable, sorted key from a list of URLs
 * Normalizes, trims, deduplicates, and sorts URLs for consistent caching
 */
export function stableKey(urls: string[]): string {
  return Array.from(new Set(urls.map((u) => normalizeUrl(u)).filter(Boolean)))
    .sort()
    .join("|");
}
