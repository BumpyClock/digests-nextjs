import { StateCreator } from "zustand";
import type { FeedItem } from "@/types";
import { Logger } from "@/utils/logger";

export type ReadStatusSlice = {
  readItems: Set<string>;
  readLaterItems: Set<string>;
  markAsRead: (itemId: string) => void;
  /**
   * Returns unread items from the provided list using the store's readItems set.
   * Server-fetched items are no longer stored in Zustand; pass them in.
   */
  getUnreadItems: (items: FeedItem[]) => FeedItem[];
  /**
   * Marks all provided items as read by adding their IDs to readItems.
   */
  markAllAsRead: (items: FeedItem[]) => void;
  addToReadLater: (itemId: string) => void;
  removeFromReadLater: (itemId: string) => void;
  isInReadLater: (itemId: string) => boolean;
  /**
   * Filters provided items by the readLaterItems set in the store.
   */
  getReadLaterItems: (items: FeedItem[]) => FeedItem[];
};

export const createReadStatusSlice: StateCreator<ReadStatusSlice, [], [], ReadStatusSlice> = (
  set,
  get
) => ({
  readItems: new Set<string>(),
  readLaterItems: new Set<string>(),

  markAsRead: (itemId: string) => {
    const { readItems } = get();
    // Ensure we're working with a Set
    const newReadItems = new Set(readItems instanceof Set ? readItems : []);

    // Check if the item is already marked as read to prevent unnecessary updates
    if (!newReadItems.has(itemId)) {
      newReadItems.add(itemId);

      // Use a "structural equality" check to avoid unnecessary rerenders
      // Only update the store if the readItems set actually changed
      set((_state) => {
        // This ensures components that don't depend on readItems won't re-render
        return { readItems: newReadItems };
      }, false); // false means don't replace the entire state, just merge
    }
  },

  getUnreadItems: (items: FeedItem[]) => {
    const { readItems } = get();
    // Ensure we're working with a Set
    const readItemsSet = new Set(readItems instanceof Set ? readItems : []);
    const unreadItems = (items || []).filter((item: FeedItem) => !readItemsSet.has(item.id));
    if (process.env.NEXT_PUBLIC_DEBUG_STORE === "true") {
      Logger.debug("unreadItems", unreadItems);
    }
    return unreadItems;
  },

  markAllAsRead: (items: FeedItem[]) => {
    const { readItems } = get();
    const updatedReadItems = new Set(readItems instanceof Set ? readItems : []);

    for (const item of items || []) {
      updatedReadItems.add(item.id);
    }

    set({ readItems: updatedReadItems });
  },

  addToReadLater: (itemId: string) => {
    const { readLaterItems } = get();
    const newReadLaterItems = new Set(readLaterItems);
    newReadLaterItems.add(itemId);
    set({ readLaterItems: newReadLaterItems });
  },

  removeFromReadLater: (itemId: string) => {
    const { readLaterItems } = get();
    const newReadLaterItems = new Set(readLaterItems);
    newReadLaterItems.delete(itemId);
    set({ readLaterItems: newReadLaterItems });
  },

  isInReadLater: (itemId: string) => {
    const { readLaterItems } = get();
    return readLaterItems.has(itemId);
  },

  getReadLaterItems: (items: FeedItem[]) => {
    const { readLaterItems } = get();
    return (items || []).filter((item: FeedItem) => readLaterItems.has(item.id));
  },
});
