import DOMPurify from "isomorphic-dompurify";
import { deduplicateHtmlImages } from "@/utils/images";

/**
 * Configuration for DOMPurify sanitization
 */
const SANITIZE_CONFIG = {
  // Allow common HTML elements for rich content
  ALLOWED_TAGS: [
    "a",
    "abbr",
    "acronym",
    "address",
    "area",
    "article",
    "aside",
    "audio",
    "b",
    "bdi",
    "bdo",
    "big",
    "blockquote",
    "br",
    "canvas",
    "caption",
    "center",
    "cite",
    "code",
    "col",
    "colgroup",
    "data",
    "datalist",
    "dd",
    "del",
    "details",
    "dfn",
    "dialog",
    "div",
    "dl",
    "dt",
    "em",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "i",
    "img",
    "ins",
    "kbd",
    "label",
    "legend",
    "li",
    "main",
    "map",
    "mark",
    "menu",
    "menuitem",
    "meter",
    "nav",
    "noscript",
    "ol",
    "optgroup",
    "option",
    "output",
    "p",
    "picture",
    "pre",
    "progress",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "section",
    "small",
    "source",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "time",
    "tr",
    "track",
    "u",
    "ul",
    "var",
    "video",
    "wbr",
  ],

  // Allow common attributes
  ALLOWED_ATTR: [
    "accept",
    "action",
    "align",
    "alt",
    "autocapitalize",
    "autocomplete",
    "autopictureinpicture",
    "autoplay",
    "background",
    "bgcolor",
    "border",
    "capture",
    "cellpadding",
    "cellspacing",
    "challenge",
    "charset",
    "cite",
    "class",
    "cols",
    "colspan",
    "content",
    "contenteditable",
    "controls",
    "coords",
    "crossorigin",
    "datetime",
    "decoding",
    "default",
    "defer",
    "dir",
    "dirname",
    "disabled",
    "download",
    "enctype",
    "enterkeyhint",
    "for",
    "form",
    "formaction",
    "formenctype",
    "formmethod",
    "formnovalidate",
    "formtarget",
    "frameborder",
    "headers",
    "height",
    "hidden",
    "high",
    "href",
    "hreflang",
    "id",
    "inputmode",
    "integrity",
    "is",
    "ismap",
    "itemprop",
    "keytype",
    "kind",
    "label",
    "lang",
    "list",
    "loading",
    "loop",
    "low",
    "manifest",
    "max",
    "maxlength",
    "media",
    "method",
    "min",
    "minlength",
    "multiple",
    "muted",
    "name",
    "nonce",
    "novalidate",
    "open",
    "optimum",
    "pattern",
    "placeholder",
    "playsinline",
    "poster",
    "preload",
    "readonly",
    "rel",
    "required",
    "reversed",
    "role",
    "rows",
    "rowspan",
    "sandbox",
    "scope",
    "selected",
    "shape",
    "size",
    "sizes",
    "span",
    "spellcheck",
    "src",
    "srcdoc",
    "srclang",
    "srcset",
    "start",
    "step",
    "style",
    "summary",
    "tabindex",
    "target",
    "title",
    "translate",
    "type",
    "usemap",
    "value",
    "width",
    "wrap",
  ],

  // Block dangerous protocols
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,

  // Remove script tags and other dangerous elements
  FORBID_TAGS: ["script", "object", "embed", "link", "style", "iframe"],

  // Remove dangerous attributes
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  try {
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } catch (error) {
    console.error("Error sanitizing HTML content:", error);
    // Return empty string on error to be safe
    return "";
  }
}

/**
 * Sanitizes HTML content specifically for reader view articles
 * This is a more permissive configuration for rich article content
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeReaderContent(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
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
    console.error("Error sanitizing reader content:", error);
    // Return empty string on error to be safe
    return "";
  }
}

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

// Named HTML entity lookup map for single-pass decoding
const namedEntityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Simple cache for text cleanup (only the function that's still widely used)
const textCleanupCache = new Map<string, string>();

// Single regex for all HTML entity forms: named (&amp;), decimal (&#39;), hex (&#x27;)
// Decodes all HTML entities in a single regex pass.
// Handles named entities (&amp;), decimal (&#39;), and hex (&#x27;) forms.
// Uses fromCodePoint to correctly handle astral-plane code points (emoji, CJK extensions).
const htmlEntityRegex = /&(?:#x([0-9a-fA-F]+)|#(\d+)|(\w+));/g;

const decodeHtmlEntities = (text: string): string =>
  text.replace(htmlEntityRegex, (match, hex, dec, named) => {
    if (hex) {
      const codePoint = parseInt(hex, 16);
      if (codePoint > 0x10ffff || codePoint < 0) return match;
      return String.fromCodePoint(codePoint);
    }
    if (dec) {
      const codePoint = Number(dec);
      if (codePoint > 0x10ffff || codePoint < 0) return match;
      return String.fromCodePoint(codePoint);
    }
    if (named) return namedEntityMap[named] ?? match;
    return match;
  });

// Mojibake patterns: UTF-8 sequences misinterpreted as Latin-1/Windows-1252
const mojibakeReplacements: TextReplacement[] = [
  [/â€™/g, "'"], // U+2019 right single quote
  [/â€“/g, "\u2013"], // U+2013 en dash (e2 80 93)
  [/â€"/g, "\u2014"], // U+2014 em dash (e2 80 94)
  [/â€œ/g, '"'], // U+201C left double quote
  [/â€\x9d/g, '"'], // U+201D right double quote (actual 0x9D byte)
];

const applyMojibakeReplacements = (value: string): string =>
  mojibakeReplacements.reduce(
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
    return applyMojibakeReplacements(decodeHtmlEntities(text));
  }

  const cached = textCleanupCache.get(text);
  if (cached) return cached;

  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(text, "text/html");
  let cleanText = doc.body.textContent || "";

  // Fix mojibake from misencoded UTF-8 sequences
  cleanText = applyMojibakeReplacements(cleanText).trim();

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
