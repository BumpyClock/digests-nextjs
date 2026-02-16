"use client";

import { useEffect, useState } from "react";

export function SmoothScroll() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor?.hash &&
        anchor.origin + anchor.pathname === window.location.origin + window.location.pathname
      ) {
        e.preventDefault();
        const targetId = anchor.hash.slice(1);
        const element = document.getElementById(targetId);

        if (element) {
          // Update URL without triggering scroll
          window.history.pushState({}, "", anchor.hash);

          // Scroll to element (respects reduced motion)
          element.scrollIntoView({
            behavior: scrollBehavior,
            block: "start",
          });
        }
      }
    };

    const handleInitialScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.slice(1);
        const element = document.getElementById(targetId);
        if (element) {
          if (scrollBehavior === "auto") {
            // Skip delay for reduced motion
            element.scrollIntoView({
              behavior: scrollBehavior,
              block: "start",
            });
          } else {
            // Small delay to ensure proper scrolling after page load
            setTimeout(() => {
              element.scrollIntoView({
                behavior: scrollBehavior,
                block: "start",
              });
            }, 100);
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    // Handle initial load with hash
    handleInitialScroll();

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [prefersReducedMotion]);

  return null;
}
