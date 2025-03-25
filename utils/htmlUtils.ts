/**
 * Cleans up modal content by removing duplicate images, excluding the thumbnail,
 * and converting images to custom next-image elements for React rendering.
 */
export const cleanupModalContent = (htmlContent: string, thumbnailUrl?: string): string => {
  if (!htmlContent) return htmlContent;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const seenImageUrls = createThumbnailUrlSet(thumbnailUrl);
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
      
      // Get original dimensions
      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      const className = img.getAttribute('class') || '';
      
      // Determine if this is likely a small image (avatar, icon, etc.)
      const isSmallImage = className.includes('avatar') || 
                          className.includes('icon') || 
                          className.includes('profile') ||
                          (width && parseInt(width) <= 100) ||
                          (height && parseInt(height) <= 100);

      // Create a custom element that we'll use to render the Next/Image component
      const wrapper = doc.createElement('next-image');
      wrapper.setAttribute('src', src);
      wrapper.setAttribute('alt', img.getAttribute('alt') || '');
      
      // Set dimensions based on context
      if (isSmallImage) {
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

      // Preserve original classes
      if (className) {
        wrapper.setAttribute('class', className);
      }

      // Handle duplicate images
      const baseUrl = src.split('?')[0];
      if (imageMap.has(baseUrl)) {
        // Remove the duplicate image
        img.parentElement?.removeChild(img);
      } else {
        // Replace the img with our custom element and store it
        img.parentNode?.replaceChild(wrapper, img);
        imageMap.set(baseUrl, wrapper);
      }
      
    } catch (error) {
      console.warn(`Invalid image URL: ${src}`, error);
      img.parentElement?.removeChild(img);
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
