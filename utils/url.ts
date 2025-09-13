export const normalizeUrl = (url?: string | null): string => {
  if (!url) return '';
  try {
    // Trim whitespace and normalize
    const trimmed = url.trim();
    if (!trimmed) return '';

    const decoded = decodeURIComponent(trimmed);
    return decoded
      .toLowerCase() // Convert to lowercase for consistency
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/\/+$/, '') // Remove trailing slashes
      .replace(/([^:])\/+/g, '$1/'); // Normalize multiple slashes
  } catch {
    // Fallback for malformed URLs
    return url
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');
  }
};
