import { useState, useCallback } from "react";
import { ScrollData } from "@/types/reader";

export function useScrollShadow() {
  const [scrollTop, setScrollTop] = useState(0);
  const [isBottomVisible, setIsBottomVisible] = useState(false);

  const handleScroll = useCallback(
    ({ scrollTop, scrollHeight, clientHeight }: ScrollData) => {
      setScrollTop(scrollTop);

      if (scrollHeight && clientHeight) {
        const bottomThreshold = 20;
        const isAtBottom =
          scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
        setIsBottomVisible(!isAtBottom);
      }

      return scrollTop;
    },
    [],
  );

  return {
    scrollTop,
    isBottomVisible,
    handleScroll,
    hasScrolled: scrollTop > 0,
  };
}
