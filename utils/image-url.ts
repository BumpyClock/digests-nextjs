import { isValidUrl } from "@/utils/url";

/**
 * Validates if a string is a valid image URL or path
 * Extends the base isValidUrl to also allow relative paths and protocol-relative URLs
 * @param url - The URL or path to validate
 * @returns True if the URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  // Check if it's a protocol-relative URL (e.g., //cdn.example.com/image.jpg)
  if (url.startsWith("//")) return true;

  // Check if it's a valid absolute URL
  if (isValidUrl(url)) return true;

  // Allow relative paths only (/, ./, ../)
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
}

/**
 * Normalizes protocol-relative URLs to absolute URLs
 * @param url - The URL to normalize
 * @returns Absolute URL with protocol
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;

  // If it's a protocol-relative URL, prepend https://
  if (url.startsWith("//")) {
    // Prefer https://, or use the current page's protocol if in browser
    const protocol = typeof window !== "undefined" && window.location.protocol === "http:"
      ? "http:"
      : "https:";
    return `${protocol}${url}`;
  }

  return url;
}
