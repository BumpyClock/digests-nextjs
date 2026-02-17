import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { feedsKeys } from "./feedsKeys";

/**
 * Hook for tracking new feed items via React Query cache updates
 *
 * This replaces Zustand-based background sync with a React Query cache-based
 * approach that listens for query updates and tracks new items.
 *
 * Features:
 * - Tracks new items added to feeds queries
 * - Provides notification count and hasNewItems flag
 * - Allows clearing notifications
 * - Works with any feeds list query
 */
export function useFeedBackgroundSync() {
  const queryClient = useQueryClient();
  const [sync, setSync] = useState({ hasNewItems: false, count: 0 });
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only listen to updated events
      if (event.type !== "updated") return;

      const key = event.query.queryKey;

      // Only track feeds list queries (not details or other query types)
      if (!feedsKeys.isList(key)) {
        return;
      }

      const data = event.query.state.data as
        | {
            items?: Array<{ id?: string }>;
          }
        | undefined;
      const items = data?.items;
      if (!Array.isArray(items)) {
        return;
      }

      // Skip extra work when cache size is empty and there are no items.
      if (items.length === 0) {
        prevIdsRef.current = new Set();
        setSync({ hasNewItems: false, count: 0 });
        return;
      }

      // Fast path for unchanged item count and exact same IDs
      const ids = items
        .map((item) => item.id)
        .filter((itemId): itemId is string => Boolean(itemId));
      if (prevIdsRef.current.size === ids.length && ids.length > 0) {
        let allKnown = true;
        for (const id of ids) {
          if (!prevIdsRef.current.has(id)) {
            allKnown = false;
            break;
          }
        }
        if (allKnown) {
          setSync({ hasNewItems: false, count: 0 });
          return;
        }
      }

      const currentIds = new Set(ids);

      // On first load, just store the IDs without triggering notification
      if (prevIdsRef.current.size === 0) {
        prevIdsRef.current = currentIds;
        setSync({ hasNewItems: false, count: 0 });
        return;
      }

      // Count new items (items in current set but not in previous set)
      let newItemCount = 0;
      currentIds.forEach((id) => {
        if (!prevIdsRef.current.has(id)) {
          newItemCount++;
        }
      });

      // Update sync state
      setSync({
        hasNewItems: newItemCount > 0,
        count: newItemCount,
      });

      // Update previous IDs for next comparison
      prevIdsRef.current = currentIds;
    });

    return unsubscribe;
  }, [queryClient]);

  const clearNotification = () => {
    setSync({ hasNewItems: false, count: 0 });
  };

  return { data: sync, clearNotification } as const;
}
