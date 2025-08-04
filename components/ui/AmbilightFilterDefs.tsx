"use client";

import React from "react";

interface AmbilightFilterDefsProps {
  /**
   * Feed card-specific parameters for the ambient light
   */
  saturation?: number;
  spread?: number;
  blur?: number;
  /**
   * If true, the final image is composited over the blurred glow, so it won't look blurry.
   */
  showSource?: boolean;
}

/**
 * Renders <defs> with a single filter that can be used across your app.
 * This component must be rendered once in a top-level layout (e.g., layout.tsx).
 */
export function AmbilightFilterDefs({
  saturation = 1,
  spread = 2,
  blur = 8,
}: AmbilightFilterDefsProps) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter
          id="feedCardAmbilight-filter"
          width="300%"
          height="300%"
          x="-0.75"
          y="-0.75"
          colorInterpolationFilters="sRGB"
        >
          {/* Copy the source for the glow */}
          <feOffset in="SourceGraphic" result="source-copy" />

          {/* Saturate the glow colors */}
          <feColorMatrix
            in="source-copy"
            type="saturate"
            values={String(saturation)}
            result="saturated-copy"
          />

          {/* Brighten up the glow colors */}
          <feColorMatrix
            in="saturated-copy"
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 33 33 33 33 -33"
            result="bright-colors"
          />

          {/* Spread outward */}
          <feMorphology
            in="bright-colors"
            operator="dilate"
            radius={spread}
            result="spread"
          />

          {/* Blur the spread area */}
          <feGaussianBlur
            in="spread"
            stdDeviation={blur}
            result="ambilight-light"
          />

          {/* Composite: Put the original image on top of the glow */}
          <feOffset in="SourceGraphic" result="source" />
          <feComposite in="source" in2="ambilight-light" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
