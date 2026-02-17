import { useCallback, useRef, useState } from "react";

export function useScrollState() {
  const [isScrolling, setIsScrolling] = useState(false);
  const rafId = useRef<number | null>(null);
  const lastScrollTop = useRef(0);
  const settleTimeoutRef = useRef<number | null>(null);

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;

    // Throttle updates to next animation frame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      // Only update if the value changed enough (reduce churn)
      if (Math.abs(scrollTop - lastScrollTop.current) >= 4) {
        lastScrollTop.current = scrollTop;

        // Clear any pending settle timeout
        if (settleTimeoutRef.current !== null) {
          clearTimeout(settleTimeoutRef.current);
        }

        // Set scrolling state to true
        setIsScrolling(true);

        // Settle delay: after 150ms of no scroll events, set to false
        settleTimeoutRef.current = window.setTimeout(() => {
          setIsScrolling(false);
          settleTimeoutRef.current = null;
        }, 150);
      }
    });
  }, []);

  return {
    isScrolling,
    handleScroll,
  };
}
