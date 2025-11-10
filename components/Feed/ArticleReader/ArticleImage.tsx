"use client";

import React, { memo } from "react";
import Image from "next/image";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { canUseImageKit } from "@/utils/imagekit";
import { isValidImageUrl, normalizeImageUrl } from "@/utils/image-url";

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
