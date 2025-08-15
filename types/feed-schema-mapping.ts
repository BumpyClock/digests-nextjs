/**
 * SCHEMA MAPPING: API Response → Internal Types
 *
 * This shows how we need to transform the actual API response
 * to our internal Feed/FeedItem types
 */

import {
  APIFeed,
  APIFeedItem,
  APIAuthor,
  APIEnclosure,
} from "./feed-api-corrected";
import { Feed, FeedItem, Enclosure } from "./feed";

/**
 * Transform API Feed to Internal Feed
 */
export function transformApiFeed(apiFeed: APIFeed): Feed {
  return {
    // Direct mappings
    feedUrl: apiFeed.feedUrl,
    description: apiFeed.description,
    favicon: apiFeed.favicon,

    // Computed/Transformed fields
    type: "feed", // Default type
    guid: apiFeed.id, // API 'id' → Internal 'guid'
    status: "active", // Default status
    siteTitle: extractSiteTitle(apiFeed), // Compute from description or other fields
    siteName: extractSiteName(apiFeed), // Compute from feedUrl or other fields
    feedTitle: apiFeed.description, // Use description as feed title
    link: apiFeed.feedUrl, // Use feedUrl as link
    lastUpdated: new Date().toISOString(), // Current timestamp
    lastRefreshed: new Date().toISOString(), // Current timestamp
    published: new Date().toISOString(), // Current timestamp
    author: transformAuthor(apiFeed.author), // Transform author object → string
    language: "en", // Default language
    categories: transformCategories(apiFeed.categories), // string → string[]

    // Optional fields with defaults
    items:
      apiFeed.items?.map((item) => transformApiFeedItem(item, apiFeed)) || [],
  };
}

/**
 * Transform API FeedItem to Internal FeedItem
 */
export function transformApiFeedItem(
  apiItem: APIFeedItem,
  parentFeed?: APIFeed,
): FeedItem {
  return {
    // Direct mappings
    id: apiItem.id,
    author: apiItem.author,
    categories: Array.isArray(apiItem.categories)
      ? apiItem.categories
      : [apiItem.categories],
    content: apiItem.content,
    content_encoded: apiItem.content_encoded,
    created: apiItem.created,
    description: apiItem.description,
    enclosures: apiItem.enclosures?.map(transformEnclosure) || [],

    // Computed/Transformed fields
    type: "article", // Default type
    title: apiItem.title || apiItem.description, // Use description if no title
    link: apiItem.link || apiItem.id, // Use id if no link
    published: apiItem.created, // Use created as published
    thumbnail: apiItem.thumbnail || "", // Default empty thumbnail
    thumbnailColor: apiItem.thumbnailColor || "#ffffff",
    thumbnailColorComputed: apiItem.thumbnailColorComputed || false,
    duration: parseInt(apiItem.duration) || 0, // API string → number

    // Feed context fields (from parent feed)
    siteTitle: parentFeed ? extractSiteTitle(parentFeed) : "",
    siteName: parentFeed ? extractSiteName(parentFeed) : "",
    feedTitle: parentFeed?.description || "",
    feedUrl: parentFeed?.feedUrl || "",
    favicon: parentFeed?.favicon || "",

    // Default fields
    favorite: false,
  };
}

/**
 * Helper functions for field transformation
 */
function transformAuthor(author: APIAuthor): string {
  if (!author) return "";
  return author.name || author.email || "";
}

function transformCategories(categories: string): string[] {
  if (!categories) return [];
  // If it's already an array, return as-is
  if (Array.isArray(categories)) return categories;
  // If it's a string, split by comma or return as single item
  return categories.includes(",")
    ? categories.split(",").map((c) => c.trim())
    : [categories];
}

function transformEnclosure(apiEnclosure: APIEnclosure): Enclosure {
  return {
    url: apiEnclosure.url,
    type: apiEnclosure.type,
    length: apiEnclosure.length,
  };
}

function extractSiteTitle(feed: APIFeed): string {
  // Try to extract a meaningful site title
  // This might need to be enhanced based on actual data patterns
  return (
    feed.description || extractDomainFromUrl(feed.feedUrl) || "Unknown Site"
  );
}

function extractSiteName(feed: APIFeed): string {
  // Extract site name from URL or use description
  return extractDomainFromUrl(feed.feedUrl) || feed.description || "Unknown";
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/**
 * CRITICAL FIXES NEEDED:
 *
 * 1. Worker must use these transform functions instead of direct mapping
 * 2. API service must handle the actual API response structure
 * 3. Tests must be updated to use either API format OR internal format consistently
 * 4. Type guards must validate against the correct schema
 */
