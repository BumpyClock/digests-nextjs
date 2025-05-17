import { normalizeUrl as baseNormalizeUrl } from "@/utils/url";

// Add a size-limited LRU cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Refresh key position (LRU behavior)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

// Replace Maps with LRU caches for better memory management
const documentCache = new LRUCache<string, Document>(50);
const normalizedUrlCache = new LRUCache<string, string>(200);
const textCleanupCache = new LRUCache<string, string>(200);

/**
 * Normalizes a URL using the shared helper with simple caching.
 */
const normalizeUrl = (url?: string): string => {
  if (!url) return '';

  const cached = normalizedUrlCache.get(url);
  if (cached) return cached;

  const normalized = baseNormalizeUrl(url);
  normalizedUrlCache.set(url, normalized);
  return normalized;
};

/**
 * Creates a set of variations of the thumbnail URL for comparison.
 * Memoized for better performance when processing multiple images.
 */
const createThumbnailUrlSet = (() => {
  const cache = new Map<string | undefined, Set<string>>();
  
  return (thumbnailUrl?: string): Set<string> => {
    if (cache.has(thumbnailUrl)) {
      return cache.get(thumbnailUrl)!;
    }
    
    const seenImageUrls = new Set<string>();
    if (thumbnailUrl) {
      seenImageUrls.add(thumbnailUrl);
      seenImageUrls.add(normalizeUrl(thumbnailUrl));
    }
    
    cache.set(thumbnailUrl, seenImageUrls);
    return seenImageUrls;
  };
})();

/**
 * Checks if the given image source is a thumbnail image.
 * Uses cached normalized URLs for better performance.
 */
const isThumbnailImage = (src: string, thumbnailUrl?: string): boolean => {
  if (!thumbnailUrl) return false;
  const normalizedSrc = normalizeUrl(src);
  const normalizedThumbnail = normalizeUrl(thumbnailUrl);
  return normalizedSrc.includes(normalizedThumbnail) || normalizedThumbnail.includes(normalizedSrc);
};

/**
 * Creates a next-image element with the given attributes
 */
const createNextImageElement = (doc: Document, {
  src,
  alt,
  width,
  height,
  className,
  isSmall
}: {
  src: string;
  alt: string;
  width?: string;
  height?: string;
  className?: string;
  isSmall: boolean;
}): HTMLElement => {
  const wrapper = doc.createElement('next-image');
  wrapper.setAttribute('src', src);
  wrapper.setAttribute('alt', alt);
  
  if (isSmall) {
    wrapper.setAttribute('width', width || '48');
    wrapper.setAttribute('height', height || '48');
    wrapper.setAttribute('small', 'true');
  } else if (width && height) {
    wrapper.setAttribute('width', width);
    wrapper.setAttribute('height', height);
  } else {
    wrapper.setAttribute('width', '1200');
    wrapper.setAttribute('height', '800');
  }

  if (className) {
    wrapper.setAttribute('class', className);
  }

  return wrapper;
};

/**
 * Cleans up modal content by removing duplicate images, excluding the thumbnail,
 * and converting images to custom next-image elements for React rendering.
 */
export const cleanupModalContent = (htmlContent: string, thumbnailUrl?: string): string => {
  if (!htmlContent) return htmlContent;
  
  // Check cache for parsed document
  const cacheKey = `${htmlContent}-${thumbnailUrl}`;
  if (documentCache.has(cacheKey)) {
    return documentCache.get(cacheKey)!.body.innerHTML;
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const imageMap = new Map<string, HTMLElement>();

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (!src) {
      img.parentElement?.removeChild(img);
      return;
    }

    if (isThumbnailImage(src, thumbnailUrl)) {
      img.parentElement?.removeChild(img);
      return;
    }

    try {
      // Validate URL
      new URL(src, window.location.origin);
      
      // Get original dimensions and determine if small image
      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      const className = img.getAttribute('class') || '';
      const isSmall = className.includes('avatar') || 
                     className.includes('icon') || 
                     className.includes('profile') ||
                     (width && parseInt(width) <= 100) ||
                     (height && parseInt(height) <= 100);

      // Create next-image element
      const wrapper = createNextImageElement(doc, {
        src,
        alt: img.getAttribute('alt') ?? '',
        width: img.getAttribute('width') ?? undefined,
        height: img.getAttribute('height') ?? undefined,
        className: img.getAttribute('class') ?? undefined,
        isSmall: Boolean(
          className?.includes('avatar') || 
          className?.includes('icon') || 
          className?.includes('profile') ||
          (width && parseInt(width) <= 100) ||
          (height && parseInt(height) <= 100)
        )
      });

      // Handle duplicate images
      const baseUrl = src.split('?')[0];
      if (imageMap.has(baseUrl)) {
        img.parentElement?.removeChild(img);
      } else {
        img.parentNode?.replaceChild(wrapper, img);
        imageMap.set(baseUrl, wrapper);
      }
    } catch (error) {
      console.warn(`Invalid image URL: ${src}`, error);
      img.parentElement?.removeChild(img);
    }
  });

  const result = doc.body.innerHTML;
  documentCache.set(cacheKey, doc);
  return result;
};

/**
 * Decodes HTML entities and cleans up special characters in text.
 * Handles cases like "A24â€™s" -> "A24's"
 * Uses caching for better performance on repeated text.
 */
export const cleanupTextContent = (text?: string): string => {
  if (!text) return '';
  
  const cached = textCleanupCache.get(text);
  if (cached) return cached;
  
  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  let cleanText = doc.body.textContent || '';
  
  // Replace common problematic characters
  const replacements: [RegExp | string, string][] = [
    [/â€™/g, "'"],    // Smart single quote
    [/â€“/g, "\u2013"],    // En dash
    [/â€”/g, "\u2014"],    // Em dash
    [/â€œ/g, '"'],    // Smart left double quote
    [/â€/g, '"'],     // Smart right double quote
    [/&nbsp;/g, ' '], // Non-breaking space
  ];
  
  // Apply all replacements
  cleanText = replacements.reduce((text, [pattern, replacement]) => 
    text.replace(pattern, replacement), cleanText).trim();
  
  textCleanupCache.set(text, cleanText);
  return cleanText;
};

// Clear caches when memory usage is high
const clearCaches = () => {
  documentCache.clear();
  normalizedUrlCache.clear();
  textCleanupCache.clear();
};

// Optional: Implement cache clearing strategy
if (typeof window !== 'undefined') {
  // Clear caches when the tab becomes hidden (user switches away)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearCaches();
    }
  });
  
  // Clear caches periodically (every 5 minutes)
  setInterval(clearCaches, 5 * 60 * 1000);
}
