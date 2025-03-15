export const normalizeFeedUrl = (url: string | null): string => {
    if (!url) return '';
    try {
      // First decode to handle any encoded URLs
      const decoded = decodeURIComponent(url);
      return decoded
        // Remove protocol
        .replace(/^https?:\/\//, '')
        // Remove trailing slashes
        .replace(/\/+$/, '')
        // Normalize multiple slashes
        .replace(/([^:]\/)\/+/g, '$1');
    } catch (error) {
      console.warn('Error normalizing URL:', error);
      return url.replace(/\/+$/, '');
    }
  };