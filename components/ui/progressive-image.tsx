"use client";

import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getImageKitUrl } from "@/utils/imagekit";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  width?: number;
  height?: number;
  initialSrc?: string; // Already loaded image URL from FeedCard
}

/**
 * True progressive image component using native progressive JPEG loading
 * Shows the same image that progressively increases in quality
 */
export function ProgressiveImage({
  src,
  alt,
  className,
  style,
  onLoad,
  onError,
  width = 800,
  height = 600,
  initialSrc,
}: ProgressiveImageProps) {
  const highResSrc = useMemo(
    () =>
      getImageKitUrl(src, {
        width,
        height,
        quality: 90,
        progressive: true,
      }),
    [height, src, width]
  );

  return (
    <Image
      src={highResSrc}
      alt={alt}
      className={cn(className, "w-full h-full object-cover")}
      style={style}
      loading="eager"
      width={width}
      height={height}
      unoptimized
      placeholder={initialSrc ? "blur" : "empty"}
      blurDataURL={initialSrc}
      onLoad={onLoad}
      onError={onError ? () => onError() : undefined}
    />
  );
}
