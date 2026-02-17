import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedItem } from "@/types";

interface UseFeedItemsControllerOptions {
  items: FeedItem[];
  initialSelectedItem?: FeedItem | null;
  selectedItem?: FeedItem | null;
  onSelectionChange?: (item: FeedItem | null) => void;
}

interface UseFeedItemsControllerReturn {
  items: FeedItem[];
  isEmpty: boolean;
  selectedItem: FeedItem | null;
  setSelectedItem: (item: FeedItem | null) => void;
  clearSelection: () => void;
  isSelected: (item?: FeedItem | null) => boolean;
}

export function useFeedItemsController({
  items,
  initialSelectedItem = null,
  selectedItem,
  onSelectionChange,
}: UseFeedItemsControllerOptions): UseFeedItemsControllerReturn {
  const normalizedItems = useMemo(() => {
    return items.filter((item): item is FeedItem => Boolean(item));
  }, [items]);

  const isControlled = selectedItem !== undefined;
  const [internalSelectedItem, setInternalSelectedItem] = useState<FeedItem | null>(
    initialSelectedItem
  );

  useEffect(() => {
    if (isControlled) {
      return;
    }

    setInternalSelectedItem((current) => {
      if (!current?.id) {
        return null;
      }

      return normalizedItems.find((item) => item.id === current.id) ?? null;
    });
  }, [isControlled, normalizedItems]);

  const selected = useMemo(() => {
    const current = isControlled ? selectedItem : internalSelectedItem;
    if (!current?.id) {
      return null;
    }

    return normalizedItems.find((item) => item.id === current.id) ?? null;
  }, [isControlled, selectedItem, internalSelectedItem, normalizedItems]);

  const setSelectedItem = useCallback(
    (item: FeedItem | null) => {
      const next = item?.id
        ? (normalizedItems.find((candidate) => candidate.id === item.id) ?? null)
        : null;

      if (isControlled) {
        onSelectionChange?.(next);
        return;
      }

      setInternalSelectedItem(next);
    },
    [isControlled, normalizedItems, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, [setSelectedItem]);

  const isSelected = useCallback(
    (item?: FeedItem | null) => {
      if (!item?.id) {
        return false;
      }

      return selected?.id === item.id;
    },
    [selected]
  );

  return {
    items: normalizedItems,
    isEmpty: normalizedItems.length === 0,
    selectedItem: selected,
    setSelectedItem,
    clearSelection,
    isSelected,
  };
}
