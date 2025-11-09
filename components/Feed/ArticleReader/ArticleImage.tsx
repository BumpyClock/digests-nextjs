"use client";

import React, { memo } from "react";
import Image from "next/image";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { canUseImageKit } from "@/utils/imagekit";
import { isValidUrl } from "@/utils/url";

/**
 * Validates if a string is a valid image URL or path
 * Extends the base isValidUrl to also allow relative paths and protocol-relative URLs
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  // Check if it's a protocol-relative URL (e.g., //cdn.example.com/image.jpg)
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

interface ArticleImageProps {
  src: string;
  alt: string;
  className: string;
  style?: React.CSSProperties;
  priority?: boolean;
  progressive?: boolean;
  initialSrc?: string;
}

/**
 * Image component for articles with progressive loading support
 * Extracted from ArticleReader to follow SRP
 */
export const ArticleImage = memo<ArticleImageProps>(
  ({
    src,
    alt,
    className,
    style,
    priority = false,
    progressive = false,
    initialSrc,
  }) => {
    // Don't render anything if there's no valid image
    if (!isValidImageUrl(src)) {
      return null;
    }

    // Normalize the image URL (handles protocol-relative URLs)
    const normalizedSrc = normalizeImageUrl(src);

    // Use progressive loading for modals when ImageKit is available
    if (progressive && canUseImageKit(normalizedSrc)) {
      return (
        <div className="relative">
          <ProgressiveImage
            src={normalizedSrc}
            alt={alt}
            className={className}
            style={style}
            width={800}
            height={600}
            initialSrc={initialSrc}
          />
        </div>
      );
    }

    // Standard image loading for non-modal views
    return (
      <Image
        src={normalizedSrc}
        alt={alt}
        width={550}
        height={413} // 4:3 aspect ratio as default
        className={className}
        style={{
          ...style,
          width: "100%",
          height: "auto",
          maxWidth: "100%",
        }}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 550px"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />
    );
  }
);

ArticleImage.displayName = "ArticleImage";
