import { useCallback, useEffect, useRef } from "react";
import { useFeedStore } from "@/store/useFeedStore";

const selectMarkAsRead = (state: ReturnType<typeof useFeedStore.getState>) => state.markAsRead;

export function useDelayedMarkAsRead(itemId?: string | null, enabled = true, delayMs = 2000) {
  const markAsRead = useFeedStore(selectMarkAsRead);
  const hasMarkedRef = useRef(false);

  useEffect(() => {
    hasMarkedRef.current = false;

    if (!enabled || !itemId) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasMarkedRef.current) {
        markAsRead(itemId);
        hasMarkedRef.current = true;
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, itemId, delayMs, markAsRead]);

  const markNow = useCallback(() => {
    if (!itemId || hasMarkedRef.current) {
      return;
    }

    markAsRead(itemId);
    hasMarkedRef.current = true;
  }, [itemId, markAsRead]);

  return { markNow, hasMarkedRef };
}
