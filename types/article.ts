/**
 * Article type definitions
 */

/**
 * Represents a full article fetched from reader view
 */
export interface Article {
  url: string;
  status: string;
  content: string;
  title: string;
  siteName: string;
  image: string;
  favicon: string;
  textContent: string;
  markdown: string;
  error?: string;
}

/**
 * Article metadata for list views
 */
export interface ArticleMetadata {
  id: string;
  url: string;
  title: string;
  siteName: string;
  image?: string;
  favicon?: string;
  publishedDate?: string;
  author?: string;
  excerpt?: string;
}
