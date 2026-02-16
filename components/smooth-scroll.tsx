"use client";

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
          // Small delay to ensure proper scrolling after page load
          setTimeout(() => {
            element.scrollIntoView({
              behavior: scrollBehavior,
              block: "start",
            });
          }, 100);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    // Handle initial load with hash
    handleInitialScroll();

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return null;
}
