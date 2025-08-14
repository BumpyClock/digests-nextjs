/**
 * Shared image configuration to ensure consistent loading across components
 * This helps Next.js cache and reuse images efficiently
 */

export const IMAGE_SIZES = {
  // Thumbnail size for cards
  thumbnail: {
    width: 400,
    height: undefined, // Let height be auto
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px",
  },

  // Hero size for detail views
  hero: {
    width: 550,
    height: undefined, // Let height be auto
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 550px",
  },

  // For small icons/favicons
  icon: {
    width: 48,
    height: 48,
    sizes: "48px",
  },
} as const;

// Shared loading strategy
export const IMAGE_LOADING = {
  // For images visible on initial load
  eager: {
    loading: "eager" as const,
    priority: true,
  },

  // For images below the fold
  lazy: {
    loading: "lazy" as const,
    priority: false,
  },
} as const;

// Helper to get consistent image props
export function getImageProps(
  type: keyof typeof IMAGE_SIZES,
  loading: keyof typeof IMAGE_LOADING = "lazy",
) {
  const size = IMAGE_SIZES[type];
  const loadingStrategy = IMAGE_LOADING[loading];

  // Build props object, only including height if defined
  const props: { width: number; sizes: string; height?: number; [key: string]: unknown } = {
    width: size.width,
    sizes: size.sizes,
    ...loadingStrategy,
  };

  if (size.height !== undefined) {
    props.height = size.height;
  }

  return props;
}
