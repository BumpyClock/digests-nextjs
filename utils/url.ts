export const normalizeUrl = (url?: string | null): string => {
  if (!url) return "";
  try {
    // Trim whitespace and normalize
    const trimmed = url.trim();
    if (!trimmed) return "";

    const decoded = decodeURIComponent(trimmed);
    return decoded
      .toLowerCase() // Convert to lowercase for consistency
      .replace(/^https?:\/\//, "") // Remove protocol
      .replace(/\/+$/, "") // Remove trailing slashes
      .replace(/([^:])\/+/g, "$1/"); // Normalize multiple slashes
  } catch {
    // Fallback for malformed URLs
    return url
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
  }
};

/**
 * Checks if a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 */
export const isValidUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Checks if a string is a valid HTTP or HTTPS URL.
 * @param url - The URL string to validate
 * @returns true if the URL uses the http or https protocol and is structurally valid
 */
export const isHttpUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  const normalized = url.trim();
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  return isValidUrl(normalized);
};


