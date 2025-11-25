"use client";

import { memo } from "react";
import Image from "next/image";
import { getImageProps } from "@/utils/image-config";
import { isValidImageUrl, normalizeImageUrl } from "@/utils/image-url";

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
