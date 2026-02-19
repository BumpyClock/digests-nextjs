/**
 * API request and response types
 */

import type { Feed, FeedItem } from "./feed";

export interface FetchFeedsResponse {
  feeds: Feed[];
  items?: FeedItem[];
  success: boolean;
  message?: string;
}

export interface ReaderViewResponse {
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
