/**
 * Read status hook using React Query and localStorage (replacing Zustand)
 *
 * This hook manages read status and read-later items using React Query
 * for server state and localStorage for persistence. This eliminates
 * the need for Zustand while maintaining the same functionality.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useFeeds } from "@/hooks/queries/use-feeds";
import type { FeedItem } from "@/types";

const READ_ITEMS_KEY = "digests-read-items";
const READ_LATER_KEY = "digests-read-later-items";

export function useReadStatus() {
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [readLaterItems, setReadLaterItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  const { data: feedsData } = useFeeds();
  const feedItems = useMemo(() => feedsData?.items || [], [feedsData?.items]);

  // Load read status from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedReadItems = localStorage.getItem(READ_ITEMS_KEY);
        const storedReadLaterItems = localStorage.getItem(READ_LATER_KEY);

        if (storedReadItems) {
          const parsed = JSON.parse(storedReadItems);
          setReadItems(new Set(Array.isArray(parsed) ? parsed : []));
        }

        if (storedReadLaterItems) {
          const parsed = JSON.parse(storedReadLaterItems);
          setReadLaterItems(new Set(Array.isArray(parsed) ? parsed : []));
        }
      } catch (error) {
        console.warn("Failed to load read status:", error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save read items to localStorage when they change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          READ_ITEMS_KEY,
          JSON.stringify(Array.from(readItems)),
        );
      } catch (error) {
        console.warn("Failed to save read items:", error);
      }
    }
  }, [readItems, isLoaded]);

  // Save read-later items to localStorage when they change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          READ_LATER_KEY,
          JSON.stringify(Array.from(readLaterItems)),
        );
      } catch (error) {
        console.warn("Failed to save read-later items:", error);
      }
    }
  }, [readLaterItems, isLoaded]);

  const markAsRead = useCallback((itemId: string) => {
    setReadItems((prev) => {
      if (prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
  }, []);

  const markAsUnread = useCallback((itemId: string) => {
    setReadItems((prev) => {
      if (!prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const getUnreadItems = useCallback(() => {
    return feedItems.filter((item: FeedItem) => !readItems.has(item.id));
  }, [feedItems, readItems]);

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(feedItems.map((item: FeedItem) => item.id));
    setReadItems(allIds);
  }, [feedItems]);

  const addToReadLater = useCallback((itemId: string) => {
    setReadLaterItems((prev) => {
      if (prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
  }, []);

  const removeFromReadLater = useCallback((itemId: string) => {
    setReadLaterItems((prev) => {
      if (!prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const isInReadLater = useCallback(
    (itemId: string) => {
      return readLaterItems.has(itemId);
    },
    [readLaterItems],
  );

  const getReadLaterItems = useCallback(() => {
    return feedItems.filter((item: FeedItem) => readLaterItems.has(item.id));
  }, [feedItems, readLaterItems]);

  const toggleReadStatus = useCallback(
    (itemId: string) => {
      if (readItems.has(itemId)) {
        markAsUnread(itemId);
      } else {
        markAsRead(itemId);
      }
    },
    [readItems, markAsRead, markAsUnread],
  );

  const toggleReadLater = useCallback(
    (itemId: string) => {
      if (readLaterItems.has(itemId)) {
        removeFromReadLater(itemId);
      } else {
        addToReadLater(itemId);
      }
    },
    [readLaterItems, addToReadLater, removeFromReadLater],
  );

  return {
    // State
    readItems,
    readLaterItems,
    isLoaded,

    // Actions
    markAsRead,
    markAsUnread,
    toggleReadStatus,
    getUnreadItems,
    markAllAsRead,
    addToReadLater,
    removeFromReadLater,
    toggleReadLater,
    isInReadLater,
    getReadLaterItems,
  };
}
