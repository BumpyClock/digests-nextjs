import type { FeedItem } from "@/types";
import { Logger } from "@/utils/logger";
import { StateCreator } from "zustand";

type ReadStatusSlice = {
  readItems: Set<string>;
  readLaterItems: Set<string>;
  markAsRead: (itemId: string) => void;
  getUnreadItems: () => FeedItem[];
  markAllAsRead: () => void;
  addToReadLater: (itemId: string) => void;
  removeFromReadLater: (itemId: string) => void;
  isInReadLater: (itemId: string) => boolean;
  getReadLaterItems: () => FeedItem[];
};

export const createReadStatusSlice: StateCreator<any, [], [], ReadStatusSlice> = (set, get) => ({
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
      set((state: any) => {
        // This ensures components that don't depend on readItems won't re-render
        return { readItems: newReadItems };
      }, false); // false means don't replace the entire state, just merge
    }
  },

  getUnreadItems: () => {
    const { feedItems, readItems } = get();
    // Safety check to ensure readItems is a Set
    const readItemsSet = readItems instanceof Set ? readItems : new Set();
    const unreadItems = feedItems.filter((item: FeedItem) => !readItemsSet.has(item.id));
    Logger.debug("unreadItems", unreadItems);
    // Ensure it returns an empty array if no unread items
    return unreadItems.length > 0 ? unreadItems : [];
  },

  markAllAsRead: () => {
    const { feedItems } = get();
    const allIds = new Set(feedItems.map((item: FeedItem) => item.id));
    set({ readItems: allIds });
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

  getReadLaterItems: () => {
    const { feedItems, readLaterItems } = get();
    // Ensure readLaterItems is a Set
    const readLaterSet = readLaterItems instanceof Set ? readLaterItems : new Set();
    return feedItems.filter((item: FeedItem) => readLaterSet.has(item.id));
  },
});