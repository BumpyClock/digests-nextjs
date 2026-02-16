import { useCallback, useRef, useState } from "react";
import { ScrollData } from "@/types/reader";

export function useScrollShadow() {
  const [scrollTop, setScrollTop] = useState(0);
  const [isBottomVisible, setIsBottomVisible] = useState(false);
  const rafId = useRef<number | null>(null);
  const lastScrollTop = useRef(0);
  const lastBottomVisible = useRef(false);

  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight }: ScrollData) => {
    // Throttle updates to next animation frame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }
    rafId.current = requestAnimationFrame(() => {
      // Only update if the value changed enough (reduce churn)
      if (Math.abs(scrollTop - lastScrollTop.current) >= 4) {
        lastScrollTop.current = scrollTop;
        setScrollTop(scrollTop);
      }

      if (scrollHeight && clientHeight) {
        const bottomThreshold = 20;
        const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
        const nextBottomVisible = !isAtBottom;
        if (nextBottomVisible !== lastBottomVisible.current) {
          lastBottomVisible.current = nextBottomVisible;
          setIsBottomVisible(nextBottomVisible);
        }
      }
    });

    return scrollTop;
  }, []);

  return {
    scrollTop,
    isBottomVisible,
    handleScroll,
    hasScrolled: scrollTop > 0,
  };
}
