export const normalizeUrl = (url?: string | null): string => {
  if (!url) return "";
  try {
    const decoded = decodeURIComponent(url);
    return decoded
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .replace(/([^:])\/+/g, "$1/");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
};
