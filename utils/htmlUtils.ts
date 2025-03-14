interface QualityMetric {
  w: number;
  cropWidth: number;
}

/**
 * Cleans up modal content by removing duplicate images, excluding the thumbnail,
 * and selecting the highest quality variant when the same image is available with different crop queries.
 */
export const cleanupModalContent = (htmlContent: string, thumbnailUrl?: string): string => {
  if (!htmlContent) return htmlContent;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const seenImageUrls = createThumbnailUrlSet(thumbnailUrl);
  const imageMap = new Map<string, { element: HTMLImageElement, quality: QualityMetric }>();

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

    const baseUrl = src.split('?')[0];
    const currentQuality = getQualityMetric(src);

    if (imageMap.has(baseUrl)) {
      const existing = imageMap.get(baseUrl)!;
      if (isHigherQuality(currentQuality, existing.quality)) {
        existing.element.parentElement?.removeChild(existing.element);
        imageMap.set(baseUrl, { element: img, quality: currentQuality });
      } else {
        img.parentElement?.removeChild(img);
      }
    } else {
      imageMap.set(baseUrl, { element: img, quality: currentQuality });
    }
  });

  return doc.body.innerHTML;
};

/**
 * Creates a set of variations of the thumbnail URL for comparison.
 */
const createThumbnailUrlSet = (thumbnailUrl?: string): Set<string> => {
  const seenImageUrls = new Set<string>();
  if (thumbnailUrl) {
    seenImageUrls.add(thumbnailUrl);
    seenImageUrls.add(thumbnailUrl.replace(/^https?:\/\//, ''));
    seenImageUrls.add(thumbnailUrl.replace(/\/$/, ''));
  }
  return seenImageUrls;
};

/**
 * Checks if the given image source is a thumbnail image.
 */
const isThumbnailImage = (src: string, thumbnailUrl?: string): boolean => {
  if (!thumbnailUrl) return false;
  const normalizedSrc = src.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const normalizedThumbnail = thumbnailUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return normalizedSrc.includes(normalizedThumbnail) || normalizedThumbnail.includes(normalizedSrc);
};

/**
 * Computes the quality metric from the URL query parameters.
 */
const getQualityMetric = (url: string): QualityMetric => {
  let w = 0;
  let cropWidth = 0;
  try {
    const urlObj = new URL(url, document.baseURI);
    const wParam = urlObj.searchParams.get('w');
    if (wParam) {
      w = parseInt(wParam, 10) || 0;
    }
    const cropParam = urlObj.searchParams.get('crop');
    if (cropParam) {
      const parts = cropParam.split(/[\s,]+/);
      if (parts.length >= 3) {
        cropWidth = parseFloat(parts[2]) || 0;
      }
    }
  } catch (err) {
    console.error("Error parsing URL:", err);
  }
  return { w, cropWidth };
};

/**
 * Compares two quality metrics to determine which is higher.
 */
const isHigherQuality = (q1: QualityMetric, q2: QualityMetric): boolean => {
  return q1.w !== q2.w ? q1.w > q2.w : q1.cropWidth > q2.cropWidth;
};

/**
 * Decodes HTML entities and cleans up special characters in text.
 * Handles cases like "A24â€™s" -> "A24's"
 */
export const cleanupTextContent = (text?: string): string => {
  if (!text) return '';
  
  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  let cleanText = doc.body.textContent || '';
  
  // Replace common problematic characters
  const replacements: [RegExp | string, string][] = [
    [/â€™/g, "'"],    // Smart single quote
    [/â€"/g, "–"],    // En dash
    [/â€"/g, "—"],    // Em dash
    [/â€œ/g, '"'],    // Smart left double quote
    [/â€/g, '"'],     // Smart right double quote
    [/&nbsp;/g, ' '], // Non-breaking space
  ];
  
  // Apply all replacements
  cleanText = replacements.reduce((text, [pattern, replacement]) => 
    text.replace(pattern, replacement), cleanText);
  
  return cleanText.trim();
};
