import { deduplicateHtmlImages } from "@/utils/imageDeduplicator";

// Simple cache for text cleanup (only the function that's still widely used)
const textCleanupCache = new Map<string, string>();

/**
 * Simplified cleanup function for HTML content fallback scenarios.
 * Just handles image deduplication without custom element creation.
 */
export const cleanupModalContent = (htmlContent: string, thumbnailUrl?: string): string => {
  if (!htmlContent) return htmlContent;

  // Apply image deduplication - this is the main benefit for HTML fallback
  return deduplicateHtmlImages(htmlContent, thumbnailUrl);
};

/**
 * Decodes HTML entities and cleans up special characters in text.
 * Handles cases like "A24â€™s" -> "A24's"
 * Uses caching for better performance on repeated text.
 */
export const cleanupTextContent = (text?: string): string => {
  if (!text) return "";

  const cached = textCleanupCache.get(text);
  if (cached) return cached;

  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(text, "text/html");
  let cleanText = doc.body.textContent || "";

  // Replace common problematic characters
  const replacements: [RegExp | string, string][] = [
    [/â€™/g, "'"], // Smart single quote
    [/â€“/g, "\u2013"], // En dash
    [/â€”/g, "\u2014"], // Em dash
    [/â€œ/g, '"'], // Smart left double quote
    [/â€/g, '"'], // Smart right double quote
    [/&nbsp;/g, " "], // Non-breaking space
  ];

  // Apply all replacements
  cleanText = replacements
    .reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), cleanText)
    .trim();

  textCleanupCache.set(text, cleanText);
  return cleanText;
};

// Simple cache clearing for the remaining text cleanup cache
if (typeof window !== "undefined") {
  // Clear cache when the tab becomes hidden (user switches away)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      textCleanupCache.clear();
    }
  });
}

interface GetSiteDisplayNameOptions {
  /** Additional fallback values to try after the standard chain */
  extraFallbacks?: (string | undefined | null)[];
}

/**
 * Gets the display name for a feed/site with fallback chain: siteName -> siteTitle -> title -> extraFallbacks
 * @param item - Object containing siteName, siteTitle, and/or title fields
 * @param options - Optional configuration with extra fallback values
 * @returns The first non-empty value in the fallback chain, or empty string
 */
export const getSiteDisplayName = (
  item: { siteName?: string; siteTitle?: string; title?: string },
  options?: GetSiteDisplayNameOptions
): string => {
  // Primary fallback chain: siteName -> siteTitle -> title
  const fallbackChain = [
    item.siteName,
    item.siteTitle,
    item.title,
    ...(options?.extraFallbacks ?? []),
  ];

  for (const candidate of fallbackChain) {
    if (candidate) return candidate;
  }

  return "";
};
