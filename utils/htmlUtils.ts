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

type TextReplacement = [RegExp | string, string];

const htmlTextReplacements: TextReplacement[] = [
  [/â€™/g, "'"], // Smart single quote
  [/â€“/g, "\u2013"], // En dash
  [/â€”/g, "\u2014"], // Em dash
  [/â€œ/g, '"'], // Smart left double quote
  [/â€/g, '"'], // Smart right double quote
  [/&nbsp;/g, " "], // Non-breaking space
];

const applyHtmlTextReplacements = (value: string): string =>
  htmlTextReplacements.reduce(
    (cleanText, [pattern, replacement]) => cleanText.replace(pattern, replacement),
    value
  );

/**
 * Decodes HTML entities and cleans up special characters in text.
 * Handles cases like "A24â€™s" -> "A24's"
 * Uses caching for better performance on repeated text.
 */
export const cleanupTextContent = (text?: string): string => {
  if (!text) return "";

  // SSR guard: DOMParser not available on server
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return applyHtmlTextReplacements(
      text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    );
  }

  const cached = textCleanupCache.get(text);
  if (cached) return cached;

  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(text, "text/html");
  let cleanText = doc.body.textContent || "";

  // Apply all replacements
  cleanText = applyHtmlTextReplacements(cleanText).trim();

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
