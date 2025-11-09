"use client";

import React, { memo } from "react";
import Image from "next/image";
import { getImageProps } from "@/utils/image-config";
import { isValidUrl } from "@/utils/url";

/**
 * Validates if a string is a valid image URL or path
 * Extends the base isValidUrl to also allow relative paths and protocol-relative URLs
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  // Check if it's a protocol-relative URL (e.g., //cdn.example.com/favicon.ico)
  if (url.startsWith("//")) return true;

  // Check if it's a valid absolute URL
  if (isValidUrl(url)) return true;

  // Allow relative paths only (/, ./, ../)
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
}

/**
 * Normalizes protocol-relative URLs to absolute URLs
 * @param url - The URL to normalize
 * @returns Absolute URL with protocol
 */
function normalizeImageUrl(url: string): string {
  if (!url) return url;

  // If it's a protocol-relative URL, prepend https://
  if (url.startsWith("//")) {
    // Prefer https://, or use the current page's protocol if in browser
    const protocol = typeof window !== "undefined" && window.location.protocol === "http:"
      ? "http:"
      : "https:";
    return `${protocol}${url}`;
  }

  return url;
}

interface SiteFaviconProps {
  favicon: string;
  siteTitle: string;
  size?: "small" | "medium";
  priority?: boolean;
}

/**
 * Displays site favicon with fallback
 * Extracted from ArticleReader to follow SRP
 */
export const SiteFavicon = memo<SiteFaviconProps>(
  ({
    favicon,
    siteTitle,
    size = "small",
    priority = false,
  }) => {
    // Validate and normalize the favicon URL
    const faviconSrc = isValidImageUrl(favicon)
      ? normalizeImageUrl(favicon)
      : "/placeholder-rss.svg";

    return (
      <Image
        src={faviconSrc}
        alt={siteTitle}
        className={`rounded ${
          size === "small" ? "max-h-5 max-w-5" : "max-h-6 max-w-6"
        }`}
        {...getImageProps("icon", priority ? "eager" : "lazy")}
      />
    );
  }
);

SiteFavicon.displayName = "SiteFavicon";
