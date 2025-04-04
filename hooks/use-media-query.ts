"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect if the current viewport matches a media query
 * @param query The media query to match
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener("change", listener)
    
    return () => media.removeEventListener("change", listener)
  }, [matches, query])

  return matches
}

/**
 * Predefined media query for mobile screens
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)")
}

/**
 * Predefined media query for tablet screens
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
}

/**
 * Predefined media query for desktop screens
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1025px)")
} 