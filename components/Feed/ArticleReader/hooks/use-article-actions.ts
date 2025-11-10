"use client";

import { useState, useEffect, useCallback } from "react";
import { useFeedStore } from "@/store/useFeedStore";

interface UseArticleActionsProps {
  itemId: string;
}

interface UseArticleActionsReturn {
  /** Whether the item is in read later list */
  isInReadLater: boolean;
  /** Toggle read later status */
  toggleReadLater: () => void;
  /** Mark item as read */
  markAsRead: () => void;
}

/**
 * Hook for managing article actions (read later, mark as read)
 * Extracted from ArticleReader to follow SRP and improve reusability
 */
export function useArticleActions({ itemId }: UseArticleActionsProps): UseArticleActionsReturn {
  const { addToReadLater, removeFromReadLater, isInReadLater, markAsRead } = useFeedStore();
  const [isInReadLaterList, setIsInReadLaterList] = useState(false);

  useEffect(() => {
    setIsInReadLaterList(isInReadLater(itemId));
  }, [itemId, isInReadLater]);

  const toggleReadLater = useCallback(() => {
    if (isInReadLaterList) {
      removeFromReadLater(itemId);
      setIsInReadLaterList(false);
    } else {
      addToReadLater(itemId);
      setIsInReadLaterList(true);
    }
  }, [itemId, isInReadLaterList, addToReadLater, removeFromReadLater]);

  const markItemAsRead = useCallback(() => {
    markAsRead(itemId);
  }, [itemId, markAsRead]);

  return {
    isInReadLater: isInReadLaterList,
    toggleReadLater,
    markAsRead: markItemAsRead,
  };
}
