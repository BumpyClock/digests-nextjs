"use client";

import { useEffect, useRef } from "react";
/* eslint-disable @next/next/no-img-element */
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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current || !initialSrc) return;

    // Start with the already-loaded FeedCard image
    imgRef.current.src = initialSrc;

    // Then load the high-quality progressive JPEG
    const highResImg = new window.Image();
    highResImg.src = getImageKitUrl(src, {
      width,
      height,
      quality: 90,
      progressive: true, // Enable progressive JPEG encoding
    });

    highResImg.onload = () => {
      // Switch to high-res version - browser will show progressive loading
      if (imgRef.current) {
        imgRef.current.src = highResImg.src;
        onLoad?.();
      }
    };

    highResImg.onerror = () => {
      onError?.();
    };

    return () => {
      highResImg.onload = null;
      highResImg.onerror = null;
    };
  }, [src, initialSrc, width, height, onLoad, onError]);

  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: uses native progressive JPEG loading */}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(className, "w-full h-full object-cover")}
        style={style}
        loading="eager"
      />
    </>
  );
}
