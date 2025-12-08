/**
 * Lightweight subscription type for storing feed metadata in Zustand
 *
 * This replaces the full Feed objects in the store, keeping only
 * essential metadata while React Query handles the full data.
 */
export interface Subscription {
  /** The feed URL (normalized) */
  feedUrl: string;
  /** Feed title from RSS/Atom */
  feedTitle: string;
  /** Site name from API response */
  siteName: string;
  /** Site title or fallback to feedTitle */
  siteTitle: string;
  title: string;
  /** Site favicon URL */
  favicon: string;
  /** Feed language (ISO code) */
  language: string;
}
