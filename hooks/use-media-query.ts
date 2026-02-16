"use client";

import { useEffect, useState } from "react";

export const DESKTOP_BREAKPOINT = 1025;
export const MOBILE_BREAKPOINT = 768;
export const TABLET_MIN_BREAKPOINT = 769;
export const TABLET_MAX_BREAKPOINT = 1024;
export const DEFAULT_WINDOW_WIDTH = 1200;
export const DEFAULT_WINDOW_HEIGHT = 800;

/**
 * Hook to detect if the current viewport matches a media query
 * @param query The media query to match
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

/**
 * Predefined media query for mobile screens
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
}

/**
 * Predefined media query for tablet screens
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT}px)`
  );
}

/**
 * Predefined media query for desktop screens
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
}
