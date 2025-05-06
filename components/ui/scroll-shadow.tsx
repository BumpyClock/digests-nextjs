"use client";

import { useEffect, useState } from "react";

interface ScrollShadowProps {
  visible?: boolean; // For backward compatibility
  position: "top" | "bottom";
  enhanced?: boolean;
}

export function ScrollShadow({ visible, position, enhanced = false }: ScrollShadowProps) {
  const [, setFallbackVisible] = useState(true);
  
  // For browsers without support for scroll-timeline
  useEffect(() => {
    if (visible !== undefined) {
      setFallbackVisible(visible);
    }
    
    // Test for scroll-timeline support
    const hasScrollTimelineSupport = CSS.supports('(animation-timeline: scroll())');
    if (!hasScrollTimelineSupport) {
      console.log('Browser does not support scroll-timeline animations, using fallback');
    }
  }, [visible]);
  
  return (
    <div 
      className={`
        scroll-indicator 
        scroll-indicator--${position} 
        ${enhanced ? 'scroll-indicator--enhanced' : ''}
        ${visible === false ? 'hidden-indicator' : ''}
        ${visible === true ? 'visible-indicator' : ''}
      `}
      aria-hidden="true"
    />
  );
} 