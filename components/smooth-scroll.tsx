"use client";

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const getScrollBehavior = () => (mediaQuery.matches ? "auto" : "smooth");

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
          window.history.pushState({}, "", anchor.hash);
          element.scrollIntoView({
            behavior: getScrollBehavior(),
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
          if (getScrollBehavior() === "auto") {
            element.scrollIntoView({
              behavior: getScrollBehavior(),
              block: "start",
            });
          } else {
            setTimeout(() => {
              element.scrollIntoView({
                behavior: getScrollBehavior(),
                block: "start",
              });
            }, 100);
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    handleInitialScroll();

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return null;
}
