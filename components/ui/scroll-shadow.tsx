"use client";

interface ScrollShadowProps {
  visible: boolean;
  position: "top" | "bottom";
  /**
   * Optional: override height in px (default 64)
   */
  heightPx?: number;
}

// Performance‑optimized scroll shadow used in ReaderView.
// Key changes:
// - Fixed height (no height animations) to avoid re-layout and repaints.
// - Opacity only transitions and will-change hint for GPU compositing.
// - Reduced blur radius (12px) + strong gradient mask for perceived softness.
// - Fallback: if backdrop-filter is expensive/unsupported, the gradient still looks good.
export function ScrollShadow({ visible, position, heightPx = 64 }: ScrollShadowProps) {
  const isTop = position === "top";
  const height = `${heightPx}px`;

  return (
    <div
      className={`absolute ${isTop ? 'top-0' : 'bottom-0'} left-0 right-0 z-10 pointer-events-none 
                 transition-opacity duration-200 ease-out`}
      style={{
        height,
        // Subtle dim to improve contrast; avoid full brightness filter.
        background: isTop
          ? 'linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0))'
          : 'linear-gradient(to top, rgba(0,0,0,0.12), rgba(0,0,0,0))',
        // Backdrop blur kept small; many GPUs can composite this smoothly.
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        // Extra mask for smoother fade; cheap compared to large blurs.
        maskImage: `linear-gradient(to ${isTop ? 'bottom' : 'top'}, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)`,
        WebkitMaskImage: `linear-gradient(to ${isTop ? 'bottom' : 'top'}, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)`,
        opacity: visible ? 1 : 0,
        willChange: 'opacity',
        contain: 'layout style paint',
      }}
    />
  );
}
