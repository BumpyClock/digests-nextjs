/**
 * Runtime type validation utilities and type guards for ensuring type safety
 * These guards provide runtime validation for data received from external sources
 */

import type { Feed, FeedItem, Enclosure } from "@/types/feed";
import type { Article, ArticleMetadata } from "@/types/article";
import type { ApiResponse, ApiError, PaginatedResponse } from "@/types/common";

/**
 * Type guard for ApiError
 */
export function isApiError(value: unknown): value is ApiError {
  if (!isObject(value)) return false;

  const error = value as Record<string, unknown>;

  return (
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    (error.statusCode === undefined || typeof error.statusCode === "number")
  );
}

/**
 * Type guard for ApiResponse
 */
export function isApiResponse<T>(
  value: unknown,
  dataValidator?: (data: unknown) => data is T,
): value is ApiResponse<T> {
  if (!isObject(value)) return false;

  const response = value as Record<string, unknown>;

  if (typeof response.success !== "boolean") return false;

  // If data exists and we have a validator, validate it
  if (response.data !== undefined && dataValidator) {
    if (!dataValidator(response.data)) return false;
  }

  // Validate optional fields
  if (response.message !== undefined && typeof response.message !== "string") {
    return false;
  }

  if (response.error !== undefined && !isApiError(response.error)) {
    return false;
  }

  return true;
}

/**
 * Type guard for PaginatedResponse
 */
export function isPaginatedResponse<T>(
  value: unknown,
  itemValidator: (item: unknown) => item is T,
): value is PaginatedResponse<T> {
  if (!isObject(value)) return false;

  const response = value as Record<string, unknown>;

  // Validate items array
  if (!Array.isArray(response.items)) return false;
  if (!response.items.every(itemValidator)) return false;

  // Validate pagination object
  if (!isObject(response.pagination)) return false;

  const pagination = response.pagination as Record<string, unknown>;

  return (
    typeof pagination.page === "number" &&
    typeof pagination.limit === "number" &&
    typeof pagination.total === "number" &&
    typeof pagination.totalPages === "number" &&
    typeof pagination.hasNext === "boolean" &&
    typeof pagination.hasPrevious === "boolean"
  );
}

/**
 * Type guard for Enclosure
 */
export function isEnclosure(value: unknown): value is Enclosure {
  if (!isObject(value)) return false;

  const enclosure = value as Record<string, unknown>;

  return (
    typeof enclosure.url === "string" &&
    typeof enclosure.type === "string" &&
    (enclosure.length === undefined || typeof enclosure.length === "string")
  );
}

/**
 * Type guard for FeedItem
 */
export function isFeedItem(value: unknown): value is FeedItem {
  if (!isObject(value)) return false;

  const item = value as Record<string, unknown>;

  // Validate required string fields
  const requiredStringFields = [
    "type",
    "id",
    "title",
    "description",
    "link",
    "author",
    "published",
    "content",
    "created",
    "content_encoded",
    "thumbnail",
    "siteTitle",
    "feedTitle",
    "feedUrl",
    "favicon",
  ];

  for (const field of requiredStringFields) {
    if (typeof item[field] !== "string") return false;
  }

  // Validate optional string fields
  const optionalStringFields = [
    "pubDate",
    "itunesEpisode",
    "itunesSeason",
    "feedImage",
  ];

  for (const field of optionalStringFields) {
    if (item[field] !== undefined && typeof item[field] !== "string") {
      return false;
    }
  }

  // Validate thumbnailColor
  if (!isObject(item.thumbnailColor)) return false;
  const color = item.thumbnailColor as Record<string, unknown>;
  if (
    typeof color.r !== "number" ||
    typeof color.g !== "number" ||
    typeof color.b !== "number"
  ) {
    return false;
  }

  // Validate categories array
  if (!Array.isArray(item.categories)) return false;
  if (!item.categories.every((cat) => typeof cat === "string")) return false;

  // Validate thumbnailColorComputed as hex color string
  if (typeof item.thumbnailColorComputed !== "string") return false;
  if (!/^#[0-9a-fA-F]{6}$/.test(item.thumbnailColorComputed)) return false;

  // Validate enclosures
  if (item.enclosures !== null) {
    if (!Array.isArray(item.enclosures)) return false;
    if (!item.enclosures.every(isEnclosure)) return false;
  }

  // Validate optional fields
  if (item.favorite !== undefined && typeof item.favorite !== "boolean") {
    return false;
  }

  if (item.duration !== undefined && typeof item.duration !== "number") {
    return false;
  }

  return true;
}

/**
 * Type guard for Feed
 */
export function isFeed(value: unknown): value is Feed {
  if (!isObject(value)) return false;

  const feed = value as Record<string, unknown>;

  // Validate required string fields
  const requiredStringFields = [
    "type",
    "guid",
    "status",
    "siteTitle",
    "feedTitle",
    "feedUrl",
    "description",
    "link",
    "lastUpdated",
    "lastRefreshed",
    "published",
    "language",
    "favicon",
    "categories",
  ];

  for (const field of requiredStringFields) {
    if (typeof feed[field] !== "string") return false;
  }

  // Validate author (string or null)
  if (feed.author !== null && typeof feed.author !== "string") {
    return false;
  }

  // Validate optional items array
  if (feed.items !== undefined) {
    if (!Array.isArray(feed.items)) return false;
    if (!feed.items.every(isFeedItem)) return false;
  }

  return true;
}

/**
 * Type guard for Article
 */
export function isArticle(value: unknown): value is Article {
  if (!isObject(value)) return false;

  const article = value as Record<string, unknown>;

  // Validate required string fields
  const requiredStringFields = [
    "url",
    "status",
    "content",
    "title",
    "siteName",
    "image",
    "favicon",
    "textContent",
    "markdown",
  ];

  for (const field of requiredStringFields) {
    if (typeof article[field] !== "string") return false;
  }

  // Validate optional error field
  if (article.error !== undefined && typeof article.error !== "string") {
    return false;
  }

  return true;
}

/**
 * Type guard for ArticleMetadata
 */
export function isArticleMetadata(value: unknown): value is ArticleMetadata {
  if (!isObject(value)) return false;

  const metadata = value as Record<string, unknown>;

  // Validate required fields
  if (
    typeof metadata.id !== "string" ||
    typeof metadata.url !== "string" ||
    typeof metadata.title !== "string" ||
    typeof metadata.siteName !== "string"
  ) {
    return false;
  }

  // Validate optional string fields
  const optionalStringFields = [
    "image",
    "favicon",
    "publishedDate",
    "author",
    "excerpt",
  ];

  for (const field of optionalStringFields) {
    if (metadata[field] !== undefined && typeof metadata[field] !== "string") {
      return false;
    }
  }

  return true;
}

/**
 * Utility function to validate arrays of a specific type
 */
export function isArrayOf<T>(
  value: unknown,
  itemValidator: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(itemValidator);
}

/**
 * Utility function to validate that a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Create a custom type guard with specific field validations
 */
export function createTypeGuard<
  T extends Record<string, unknown>,
>(validations: {
  [K in keyof T]: (value: unknown) => boolean;
}): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (!isObject(value)) return false;

    const obj = value as Record<string, unknown>;

    for (const [field, validator] of Object.entries(validations)) {
      const validatorFn = validator as (value: unknown) => boolean;
      if (!validatorFn(obj[field])) return false;
    }

    return true;
  };
}

/**
 * Runtime validation function that throws descriptive errors
 */
export function validateType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  typeName: string,
): T {
  if (!typeGuard(value)) {
    throw new TypeError(`Invalid ${typeName}: validation failed`);
  }
  return value;
}

/**
 * Safe parse function that returns a Result type
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function safeParse<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  typeName: string,
): Result<T> {
  try {
    if (typeGuard(value)) {
      return { success: true, data: value };
    }
    return {
      success: false,
      error: new TypeError(`Invalid ${typeName}: validation failed`),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error : new Error("Unknown validation error"),
    };
  }
}

/**
 * Type guard for Reader View responses
 */
export function isReaderView(value: unknown): value is { url: string; title?: string; content?: string; [key: string]: unknown } {
  if (!isObject(value)) return false;

  const reader = value as Record<string, unknown>;

  // Basic validation for reader view structure
  return (
    typeof reader.url === "string" &&
    typeof reader.title === "string" &&
    typeof reader.content === "string"
  );
}

/**
 * Type guard for Podcast Feeds
 */
export function isPodcastFeed(value: unknown): value is Feed {
  if (!isFeed(value)) return false;

  const feed = value as Feed;

  // Check for podcast-specific indicators
  return (
    feed.type === "podcast" ||
    (Array.isArray(feed.categories)
      ? feed.categories.some(
          (cat) =>
            typeof cat === "string" && cat.toLowerCase().includes("podcast"),
        )
      : false) ||
    (feed.description && typeof feed.description === "string"
      ? feed.description.toLowerCase().includes("podcast")
      : false) ||
    Boolean(
      feed.items?.some((item) => item.enclosures && item.enclosures.length > 0),
    )
  );
}

/**
 * Type guard for Podcast Items
 */
export function isPodcastItem(value: unknown): value is FeedItem {
  if (!isFeedItem(value)) return false;

  const item = value as FeedItem;

  // Check for podcast-specific indicators
  return (
    item.type === "podcast" ||
    Boolean(item.enclosures && item.enclosures.length > 0) ||
    Boolean(item.duration) ||
    Boolean(item.itunesEpisode || item.itunesSeason)
  );
}
