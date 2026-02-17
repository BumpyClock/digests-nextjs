import { normalizeUrl } from "@/utils/url";
import { cleanupMarkdownMetadata } from "@/utils/content-cleanup";

interface ImageInfo {
  original: string;
  base: string;
  params: URLSearchParams;
  quality: number;
  width: number;
  height: number;
  cropArea: number;
}

/**
 * Extracts image information from a URL for comparison and quality assessment
 */
function extractImageInfo(url: string): ImageInfo {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Extract base URL (path + filename without query parameters)
    const base = `${urlObj.origin}${urlObj.pathname}`;

    // Extract quality (default to 90 if not specified)
    const quality = Number.parseInt(params.get("quality") || "90", 10);

    // Extract width (default to 0 if not specified)
    const width = Number.parseInt(params.get("w") || params.get("width") || "0", 10);

    // Extract height (default to 0 if not specified)
    const height = Number.parseInt(params.get("h") || params.get("height") || "0", 10);

    // Calculate crop area from crop parameter if present
    // Format: crop=left,top,right,bottom (percentages)
    let cropArea = 10000; // Default to full area (100% x 100%)
    const crop = params.get("crop");
    if (crop) {
      const coords = crop.split(",").map((v) => {
        const parsed = Number.parseFloat(v);
        return Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
      });

      if (coords.length === 4) {
        const [left, top, right, bottom] = coords;
        // Ensure right >= left and bottom >= top
        if (right >= left && bottom >= top) {
          cropArea = (right - left) * (bottom - top);
        } else {
          cropArea = 0; // Invalid crop coordinates
        }
      }
    }

    return {
      original: url,
      base,
      params,
      quality,
      width,
      height,
      cropArea,
    };
  } catch (_error) {
    // Fallback for invalid URLs
    return {
      original: url,
      base: url.split("?")[0],
      params: new URLSearchParams(),
      quality: 90,
      width: 0,
      height: 0,
      cropArea: 10000,
    };
  }
}

/**
 * Chooses the best version of an image from a group of duplicates
 * Prioritizes: larger crop area > higher quality > larger dimensions
 */
function chooseBestImageVersion(images: ImageInfo[]): ImageInfo {
  if (images.length === 1) return images[0];

  return images.reduce((best, current) => {
    // Prioritize larger crop area (less cropped = better)
    if (current.cropArea > best.cropArea) return current;
    if (current.cropArea < best.cropArea) return best;

    // If crop area is equal, prioritize higher quality
    if (current.quality > best.quality) return current;
    if (current.quality < best.quality) return best;

    // If quality is equal, prioritize larger dimensions
    const currentSize = current.width * current.height;
    const bestSize = best.width * best.height;

    if (currentSize > bestSize) return current;
    return best;
  });
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes duplicate images from markdown content based on sophisticated URL analysis
 */
export function deduplicateMarkdownImages(markdown: string, thumbnailUrl?: string): string {
  if (!markdown) return markdown;

  // Find all markdown images: ![alt](url) or ![alt](url "title")
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const images: { match: string; alt: string; url: string; info: ImageInfo }[] = [];
  let match: RegExpExecArray | null = imageRegex.exec(markdown);

  while (match !== null) {
    const [fullMatch, alt, url] = match;
    const info = extractImageInfo(url);
    images.push({ match: fullMatch, alt, url, info });

    match = imageRegex.exec(markdown);
  }

  if (images.length === 0) return markdown;

  // Group images by base URL
  const imageGroups = new Map<string, typeof images>();
  images.forEach((img) => {
    const base = img.info.base;
    if (!imageGroups.has(base)) {
      imageGroups.set(base, []);
    }
    const group = imageGroups.get(base);
    if (group) {
      group.push(img);
    }
  });

  // Choose best version from each group and create replacement map
  const replacements = new Map<string, string>();

  imageGroups.forEach((group, base) => {
    // Skip thumbnail images
    if (
      thumbnailUrl &&
      (normalizeUrl(base).includes(normalizeUrl(thumbnailUrl)) ||
        normalizeUrl(thumbnailUrl).includes(normalizeUrl(base)))
    ) {
      // Mark all instances of thumbnail for removal
      group.forEach((img) => {
        replacements.set(img.match, "");
      });
      return;
    }

    if (group.length > 1) {
      // Multiple versions found - choose the best one
      const bestImage = chooseBestImageVersion(group.map((g) => g.info));
      const bestMatch = group.find((g) => g.info.original === bestImage.original);

      if (bestMatch) {
        // Keep the best version, remove others
        group.forEach((img) => {
          if (img !== bestMatch) {
            replacements.set(img.match, "");
          }
        });
      }
    }
  });

  // Apply all replacements in a single pass
  if (replacements.size === 0) return markdown;
  const escapedKeys = Array.from(replacements.keys()).map(escapeRegExp);
  const combinedPattern = new RegExp(escapedKeys.join("|"), "g");
  let result = markdown.replace(combinedPattern, (match) => replacements.get(match) ?? match);

  // Clean up extra newlines left by removed images
  result = result.replace(/\n\s*\n\s*\n/g, "\n\n");

  return result;
}

/**
 * Enhanced HTML image deduplication with better CDN parameter handling
 */
export function deduplicateHtmlImages(htmlContent: string, thumbnailUrl?: string): string {
  if (!htmlContent) return htmlContent;

  // Check if running in browser environment
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // In Node.js environment, return content as-is or implement server-side parsing
    console.warn(
      "DOMParser not available in server environment, skipping HTML image deduplication"
    );
    return htmlContent;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));

  if (images.length === 0) return htmlContent;

  // Group images by base URL
  const imageGroups = new Map<string, { element: HTMLImageElement; info: ImageInfo }[]>();

  images.forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) {
      img.remove();
      return;
    }

    const info = extractImageInfo(src);

    if (!imageGroups.has(info.base)) {
      imageGroups.set(info.base, []);
    }
    const group = imageGroups.get(info.base);
    if (group) {
      group.push({ element: img, info });
    }
  });

  // Process each group
  imageGroups.forEach((group, base) => {
    // Check if this is a thumbnail image
    if (
      thumbnailUrl &&
      (normalizeUrl(base).includes(normalizeUrl(thumbnailUrl)) ||
        normalizeUrl(thumbnailUrl).includes(normalizeUrl(base)))
    ) {
      // Remove all thumbnail images
      group.forEach(({ element }) => element.remove());
      return;
    }

    if (group.length > 1) {
      // Multiple versions found - choose the best one
      const bestImage = chooseBestImageVersion(group.map((g) => g.info));

      // Remove all except the best version
      group.forEach(({ element, info }) => {
        if (info.original !== bestImage.original) {
          element.remove();
        }
      });
    }
  });

  return doc.body.innerHTML;
}

/**
 * Comprehensive markdown cleanup: removes metadata and duplicate images
 */
export function cleanupMarkdownContent(
  markdown: string,
  thumbnailUrl?: string,
  title?: string,
  author?: string,
  siteName?: string
): { cleanedMarkdown: string; extractedAuthor?: { name: string; image?: string } } {
  if (!markdown) return { cleanedMarkdown: markdown };

  // First remove metadata (title, author, source) and extract author info
  const { cleanedMarkdown: metadataCleaned, extractedAuthor } = cleanupMarkdownMetadata(
    markdown,
    title,
    author,
    siteName
  );

  // Then remove duplicate images
  const finalCleaned = deduplicateMarkdownImages(metadataCleaned, thumbnailUrl);

  return {
    cleanedMarkdown: finalCleaned,
    extractedAuthor,
  };
}

/**
 * Export the metadata cleanup function for standalone use
 */
export { cleanupMarkdownMetadata };
