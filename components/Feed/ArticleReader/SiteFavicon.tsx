"use client";

import React, { memo } from "react";
import Image from "next/image";
import { getImageProps } from "@/utils/image-config";
import { isValidUrl } from "@/utils/url";

/**
 * Validates if a string is a valid image URL or path
 * Extends the base isValidUrl to also allow relative paths
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  // Check if it's a valid absolute URL
  if (isValidUrl(url)) return true;

  // Allow relative paths only (/, ./, ../)
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
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
    const faviconSrc = isValidImageUrl(favicon) ? favicon : "/placeholder-rss.svg";

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
