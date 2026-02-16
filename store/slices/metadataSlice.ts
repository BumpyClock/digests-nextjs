import { StateCreator } from "zustand";

// Simplified MetadataSlice - server loading states are now handled by React Query
// This slice only manages client-side UI state and hydration
export type MetadataSlice = {
  initialized: boolean;
  activeFeed: string | null;
  setInitialized: (value: boolean) => void;
  setActiveFeed: (feedUrl: string | null) => void;
};

export const createMetadataSlice: StateCreator<MetadataSlice, [], [], MetadataSlice> = (
  set,
  _get
) => ({
  initialized: false,
  activeFeed: null as string | null,

  setInitialized: (value: boolean) => set({ initialized: value }),
  setActiveFeed: (feedUrl: string | null) => set({ activeFeed: feedUrl }),
});
