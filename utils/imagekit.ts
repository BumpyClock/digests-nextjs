/**
 * ImageKit URL transformation utilities
 * Provides functions to generate optimized image URLs using ImageKit CDN
 */

interface ImageKitTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  blur?: number;
  format?: "auto" | "webp" | "jpg" | "png";
  crop?: "maintain_ratio" | "force" | "at_least" | "at_max";
  focus?: "auto" | "face" | "center";
  progressive?: boolean;
}

// Configure your ImageKit endpoint
const IMAGEKIT_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGEKIT_ENDPOINT || "https://ik.imagekit.io/your-id";

/**
 * Generates an ImageKit URL with transformations
 * @param originalUrl - The original image URL
 * @param options - Transformation options
 * @returns Transformed ImageKit URL
 */
export function getImageKitUrl(
  originalUrl: string,
  options: ImageKitTransformOptions = {},
): string {
  // If already an ImageKit URL, just add transformations
  if (originalUrl.includes("ik.imagekit.io")) {
    return applyImageKitTransformations(originalUrl, options);
  }

  // For external URLs, use ImageKit's URL-based transformation
  // Encode the original URL
  const encodedUrl = encodeURIComponent(originalUrl);

  // Build transformation string
  const transformations = buildTransformationString(options);

  // Construct ImageKit URL
  // Format: https://ik.imagekit.io/your-id/tr:w-400,h-300,q-80/https://example.com/image.jpg
  return `${IMAGEKIT_ENDPOINT}/${transformations}${encodedUrl}`;
}

/**
 * Builds ImageKit transformation string from options
 */
function buildTransformationString(options: ImageKitTransformOptions): string {
  const transforms: string[] = ["tr:"];

  if (options.width) {
    transforms.push(`w-${options.width}`);
  }

  if (options.height) {
    transforms.push(`h-${options.height}`);
  }

  if (options.quality) {
    transforms.push(`q-${options.quality}`);
  }

  if (options.blur) {
    transforms.push(`bl-${options.blur}`);
  }

  if (options.format) {
    transforms.push(`f-${options.format}`);
  }

  if (options.crop) {
    transforms.push(`c-${options.crop}`);
  }

  if (options.focus) {
    transforms.push(`fo-${options.focus}`);
  }

  // Add progressive loading if specified or by default for JPEGs
  if (
    options.progressive !== false &&
    (!options.format || options.format === "jpg" || options.format === "auto")
  ) {
    transforms.push("pr-true");
  }

  return transforms.length > 1 ? transforms.join(",") + "/" : "";
}

/**
 * Applies transformations to existing ImageKit URLs
 */
function applyImageKitTransformations(
  url: string,
  options: ImageKitTransformOptions,
): string {
  const transformations = buildTransformationString(options);

  // Check if URL already has transformations
  const hasTransformations = url.includes("/tr:");

  if (hasTransformations) {
    // Replace existing transformations
    return url.replace(/\/tr:[^\/]+\//, `/${transformations}`);
  } else {
    // Add transformations after the endpoint
    const parts = url.split("/");
    const endpointIndex =
      parts.findIndex((part) => part.includes("ik.imagekit.io")) + 1;
    parts.splice(endpointIndex + 1, 0, transformations.slice(0, -1)); // Remove trailing /
    return parts.join("/");
  }
}

/**
 * Presets for common use cases
 */
export const IMAGE_PRESETS = {
  feedCardThumbnail: {
    width: 400,
    height: 300,
    quality: 85,
    format: "jpg" as const, // Use JPEG for progressive loading
    crop: "maintain_ratio" as const,
    progressive: true,
  },
  feedCardLowRes: {
    width: 100,
    height: 75,
    quality: 30,
    blur: 10,
    format: "jpg" as const,
    progressive: true,
  },
  modalHighRes: {
    width: 1200,
    height: 900,
    quality: 90,
    format: "jpg" as const, // Use JPEG for progressive loading
    crop: "at_max" as const,
    progressive: true,
  },
  modalLowRes: {
    width: 200,
    height: 150,
    quality: 30,
    blur: 15,
    format: "jpg" as const,
    progressive: true,
  },
} as const;

/**
 * Helper to check if URL is from a supported image source
 */
export function canUseImageKit(url: string): boolean {
  // You can add logic here to check if the image source supports ImageKit
  // For now, we'll assume all HTTPS images can be proxied
  return url.startsWith("https://");
}
