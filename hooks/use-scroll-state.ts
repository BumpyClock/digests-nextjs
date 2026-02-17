import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_DELTA_THRESHOLD = 4;
const SCROLL_SETTLE_DELAY_MS = 150;

export function useScrollState() {
  const [isScrolling, setIsScrolling] = useState(false);
  const rafId = useRef<number | null>(null);
  const lastScrollTop = useRef(0);
  const settleTimeoutRef = useRef<number | null>(null);

  const handleScroll = useCallback((input: Event | number) => {
    const scrollTop =
      typeof input === "number" ? input : ((input.target as HTMLElement | null)?.scrollTop ?? 0);

    // Throttle updates to next animation frame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      // Only update if the value changed enough (reduce churn)
      if (Math.abs(scrollTop - lastScrollTop.current) >= SCROLL_DELTA_THRESHOLD) {
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
        }, SCROLL_SETTLE_DELAY_MS);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (settleTimeoutRef.current !== null) {
        clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  return {
    isScrolling,
    handleScroll,
  };
}
