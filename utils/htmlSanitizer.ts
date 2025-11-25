import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration for DOMPurify sanitization
 */
const SANITIZE_CONFIG = {
  // Allow common HTML elements for rich content
  ALLOWED_TAGS: [
    'a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio',
    'b', 'bdi', 'bdo', 'big', 'blockquote', 'br', 'button',
    'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup',
    'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
    'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'i', 'img', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'menu', 'menuitem', 'meter',
    'nav', 'noscript', 'ol', 'optgroup', 'option', 'output',
    'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby',
    's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track',
    'u', 'ul', 'var', 'video', 'wbr'
  ],
  
  // Allow common attributes
  ALLOWED_ATTR: [
    'accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay',
    'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'challenge', 'charset',
    'cite', 'class', 'cols', 'colspan', 'content', 'contenteditable', 'controls', 'coords', 'crossorigin',
    'datetime', 'decoding', 'default', 'defer', 'dir', 'dirname', 'disabled', 'download',
    'enctype', 'enterkeyhint', 'for', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate',
    'formtarget', 'frameborder', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang',
    'id', 'inputmode', 'integrity', 'is', 'ismap', 'itemprop', 'keytype', 'kind',
    'label', 'lang', 'list', 'loading', 'loop', 'low', 'manifest', 'max', 'maxlength', 'media',
    'method', 'min', 'minlength', 'multiple', 'muted',
    'name', 'nonce', 'novalidate', 'open', 'optimum',
    'pattern', 'placeholder', 'playsinline', 'poster', 'preload',
    'readonly', 'rel', 'required', 'reversed', 'role', 'rows', 'rowspan',
    'sandbox', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'spellcheck', 'src', 'srcdoc',
    'srclang', 'srcset', 'start', 'step', 'style', 'summary', 'tabindex', 'target', 'title',
    'translate', 'type', 'usemap', 'value', 'width', 'wrap'
  ],
  
  // Block dangerous protocols
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  
  // Remove script tags and other dangerous elements
  FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'iframe'],
  
  // Remove dangerous attributes
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  try {
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } catch (error) {
    console.error('Error sanitizing HTML content:', error);
    // Return empty string on error to be safe
    return '';
  }
}

/**
 * Sanitizes HTML content specifically for reader view articles
 * This is a more permissive configuration for rich article content
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeReaderContent(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  try {
    // More permissive config for article content
    const readerConfig = {
      ...SANITIZE_CONFIG,
      // Allow inline styles for article formatting
      ALLOW_DATA_ATTR: false,
      // Keep relative URLs but sanitize them
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    };
    
    return DOMPurify.sanitize(html, readerConfig);
  } catch (error) {
    console.error('Error sanitizing reader content:', error);
    // Return empty string on error to be safe
    return '';
  }
}