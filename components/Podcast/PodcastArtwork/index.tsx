"use client";

import { useState } from "react";
import Image from "next/image";
import { Ambilight } from "@/components/ui/ambilight";
import { cn } from "@/lib/utils";
import { getImageProps } from "@/utils/image-config";
import { ProgressiveImage } from "@/components/ui/progressive-image";

interface PodcastArtworkProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  showAmbilight?: boolean;
  className?: string;
  parentHovered?: boolean;
  ambilightOpacity?: { rest: number; hover: number };
  priority?: boolean;
  progressive?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-32 h-32",
  xl: "w-48 h-48 md:w-64 md:h-64",
};

export function PodcastArtwork({
  src,
  alt,
  size = "md",
  showAmbilight = false,
  className,
  parentHovered = false,
  ambilightOpacity = { rest: 0, hover: 0.7 },
  priority = false,
  progressive = false,
}: PodcastArtworkProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const shouldShowImage = !imageError && src && isValidUrl(src);
  const imageSrc = shouldShowImage ? src : "/placeholder-podcast.svg";

  // Use consistent sizing with FeedCard for better caching
  const isLargeSize = size === "xl" || size === "lg" || size === "md";
  const imageProps = isLargeSize
    ? getImageProps("thumbnail", priority ? "eager" : "lazy")
    : getImageProps("icon", priority ? "eager" : "lazy");

  const imageComponent = (
    <div className={cn("relative overflow-hidden", sizeClasses[size], className)}>
      {progressive && isLargeSize ? (
        <ProgressiveImage
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={imageProps.width}
          height={imageProps.height}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoading ? "opacity-0" : "opacity-100"
          )}
          sizes={imageProps.sizes}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoading(false)}
          loading={imageProps.loading}
          priority={imageProps.priority}
        />
      )}
    </div>
  );

  if (showAmbilight && shouldShowImage) {
    return (
      <Ambilight
        className={cn("relative", sizeClasses[size], className)}
        parentHovered={parentHovered}
        opacity={ambilightOpacity}
      >
        {imageComponent}
      </Ambilight>
    );
  }

  return imageComponent;
}
