/**
 * Storage-related types and interfaces
 */

import type { Feed, FeedItem } from "./feed";

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

export interface StorageProvider {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface FeedStorage {
  feeds: Feed[];
  lastUpdated: number;
}

export interface FeedItemStorage {
  items: FeedItem[];
  lastUpdated: number;
}

export interface StorageKeys {
  FEEDS: "digests-feeds";
  FEED_ITEMS: "digests-items";
  SETTINGS: "digests-settings";
  FAVORITES: "digests-favorites";
}

export interface StorageConfig {
  prefix: string;
  version: string;
  ttl: number; // Time to live in milliseconds
}
