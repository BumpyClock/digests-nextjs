"use client";

import { useCallback } from "react";
import { toggleFavoriteAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useIsInReadLater, useReadActions, useReadLaterActions } from "@/hooks/useFeedSelectors";
import { type ContentType, handleShare, showReadLaterToast } from "./content-actions-utils";

type UseContentActionsArg = ContentType | { contentType: ContentType; itemId?: string };

export interface UseContentActionsReturn {
  handleBookmark: (
    itemId: string,
    isBookmarked: boolean,
    setIsBookmarked: (value: boolean) => void
  ) => Promise<void>;
  handleShare: (url?: string, title?: string, description?: string) => Promise<void>;
  isInReadLater: boolean;
  toggleReadLater: () => void;
  markAsRead: () => void;
}

export function useContentActions(arg: UseContentActionsArg): UseContentActionsReturn {
  const { toast } = useToast();
  const contentType = typeof arg === "string" ? arg : arg.contentType;
  const itemId = typeof arg === "string" ? "" : (arg.itemId ?? "");

  const isInReadLater = useIsInReadLater(itemId);
  const { addToReadLater, removeFromReadLater } = useReadLaterActions();
  const { markAsRead: markAsReadAction } = useReadActions();

  const handleBookmark = useCallback(
    async (
      targetItemId: string,
      isBookmarked: boolean,
      setIsBookmarked: (value: boolean) => void
    ) => {
      setIsBookmarked(!isBookmarked);

      const result = await toggleFavoriteAction(targetItemId);

      if (result.success) {
        toast({
          title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
          description: isBookmarked
            ? `This ${contentType} has been removed from your bookmarks.`
            : `This ${contentType} has been added to your bookmarks.`,
        });
      } else {
        setIsBookmarked(isBookmarked);

        toast({
          title: "Error",
          description: result.message || "Failed to update bookmark status",
          variant: "destructive",
        });
      }
    },
    [contentType, toast]
  );

  const handleShareAction = useCallback(
    async (url?: string, title?: string, description?: string) => {
      if (!url) {
        toast({
          title: "Error",
          description: "No URL available to share",
          variant: "destructive",
        });
        return;
      }

      await handleShare({
        url,
        title: title || `Share ${contentType}`,
        description: description || `Check out this ${contentType}`,
        contentType,
      });
    },
    [contentType, toast]
  );

  const toggleReadLater = useCallback(() => {
    if (!itemId) {
      return;
    }

    const wasInReadLater = isInReadLater;
    if (wasInReadLater) {
      removeFromReadLater(itemId);
    } else {
      addToReadLater(itemId);
    }
    showReadLaterToast(wasInReadLater, contentType);
  }, [addToReadLater, contentType, isInReadLater, itemId, removeFromReadLater]);

  const markAsRead = useCallback(() => {
    if (!itemId) {
      return;
    }

    markAsReadAction(itemId);
  }, [itemId, markAsReadAction]);

  return {
    handleBookmark,
    handleShare: handleShareAction,
    isInReadLater: itemId ? isInReadLater : false,
    toggleReadLater,
    markAsRead,
  };
}
