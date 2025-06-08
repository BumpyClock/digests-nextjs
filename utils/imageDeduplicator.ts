import { normalizeUrl } from "@/utils/url";

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
    const quality = parseInt(params.get('quality') || '90');
    
    // Extract width (default to 0 if not specified)
    const width = parseInt(params.get('w') || params.get('width') || '0');
    
    // Extract height (default to 0 if not specified) 
    const height = parseInt(params.get('h') || params.get('height') || '0');
    
    // Calculate crop area from crop parameter if present
    // Format: crop=left,top,right,bottom (percentages)
    let cropArea = 10000; // Default to full area (100% x 100%)
    const crop = params.get('crop');
    if (crop) {
      const [left, top, right, bottom] = crop.split(',').map(v => parseFloat(v) || 0);
      cropArea = (right - left) * (bottom - top);
    }
    
    return {
      original: url,
      base,
      params,
      quality,
      width,
      height,
      cropArea
    };
  } catch (error) {
    // Fallback for invalid URLs
    return {
      original: url,
      base: url.split('?')[0],
      params: new URLSearchParams(),
      quality: 90,
      width: 0,
      height: 0,
      cropArea: 10000
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
 * Removes duplicate images from markdown content based on sophisticated URL analysis
 */
export function deduplicateMarkdownImages(markdown: string, thumbnailUrl?: string): string {
  if (!markdown) return markdown;
  
  // Find all markdown images: ![alt](url) or ![alt](url "title")
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const images: { match: string; alt: string; url: string; info: ImageInfo }[] = [];
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const [fullMatch, alt, url] = match;
    const info = extractImageInfo(url);
    images.push({ match: fullMatch, alt, url, info });
  }
  
  if (images.length === 0) return markdown;
  
  // Group images by base URL
  const imageGroups = new Map<string, typeof images>();
  images.forEach(img => {
    const base = img.info.base;
    if (!imageGroups.has(base)) {
      imageGroups.set(base, []);
    }
    imageGroups.get(base)!.push(img);
  });
  
  // Choose best version from each group and create replacement map
  const replacements = new Map<string, string>();
  const thumbnailSet = thumbnailUrl ? new Set([thumbnailUrl, normalizeUrl(thumbnailUrl)]) : new Set();
  
  imageGroups.forEach((group, base) => {
    // Skip thumbnail images
    if (thumbnailUrl && (
      normalizeUrl(base).includes(normalizeUrl(thumbnailUrl)) ||
      normalizeUrl(thumbnailUrl).includes(normalizeUrl(base))
    )) {
      // Mark all instances of thumbnail for removal
      group.forEach(img => {
        replacements.set(img.match, '');
      });
      return;
    }
    
    if (group.length > 1) {
      // Multiple versions found - choose the best one
      const bestImage = chooseBestImageVersion(group.map(g => g.info));
      const bestMatch = group.find(g => g.info.original === bestImage.original);
      
      if (bestMatch) {
        // Keep the best version, remove others
        group.forEach(img => {
          if (img !== bestMatch) {
            replacements.set(img.match, '');
          }
        });
      }
    }
  });
  
  // Apply replacements
  let result = markdown;
  replacements.forEach((replacement, original) => {
    result = result.replace(original, replacement);
  });
  
  // Clean up extra newlines left by removed images
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result;
}

/**
 * Enhanced HTML image deduplication with better CDN parameter handling
 */
export function deduplicateHtmlImages(htmlContent: string, thumbnailUrl?: string): string {
  if (!htmlContent) return htmlContent;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  
  if (images.length === 0) return htmlContent;
  
  // Group images by base URL
  const imageGroups = new Map<string, { element: HTMLImageElement; info: ImageInfo }[]>();
  
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (!src) {
      img.remove();
      return;
    }
    
    const info = extractImageInfo(src);
    
    if (!imageGroups.has(info.base)) {
      imageGroups.set(info.base, []);
    }
    imageGroups.get(info.base)!.push({ element: img, info });
  });
  
  // Process each group
  imageGroups.forEach((group, base) => {
    // Check if this is a thumbnail image
    if (thumbnailUrl && (
      normalizeUrl(base).includes(normalizeUrl(thumbnailUrl)) ||
      normalizeUrl(thumbnailUrl).includes(normalizeUrl(base))
    )) {
      // Remove all thumbnail images
      group.forEach(({ element }) => element.remove());
      return;
    }
    
    if (group.length > 1) {
      // Multiple versions found - choose the best one
      const bestImage = chooseBestImageVersion(group.map(g => g.info));
      
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
 * Unified function to deduplicate images in both HTML and markdown content
 */
export function deduplicateImages(content: string, thumbnailUrl?: string, isMarkdown = false): string {
  if (isMarkdown) {
    return deduplicateMarkdownImages(content, thumbnailUrl);
  } else {
    return deduplicateHtmlImages(content, thumbnailUrl);
  }
}