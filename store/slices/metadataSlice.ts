import { StateCreator } from "zustand";

type MetadataSlice = {
  loading: boolean;
  refreshing: boolean;
  initialized: boolean;
  lastRefreshed: number | null;
  hydrated: boolean;
  activeFeed: string | null;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setInitialized: (value: boolean) => void;
  setHydrated: (state: boolean) => void;
  setActiveFeed: (feedUrl: string | null) => void;
  shouldRefresh: () => boolean;
};

export const createMetadataSlice: StateCreator<any, [], [], MetadataSlice> = (set, get) => ({
  loading: false,
  refreshing: false,
  initialized: false,
  lastRefreshed: null as number | null,
  hydrated: false,
  activeFeed: null as string | null,

  setLoading: (loading: boolean) => set({ loading }),
  setRefreshing: (refreshing: boolean) => set({ refreshing }),
  setInitialized: (value: boolean) => set({ initialized: value }),
  setHydrated: (state: boolean) => set({ hydrated: state }),
  setActiveFeed: (feedUrl: string | null) => set({ activeFeed: feedUrl }),

  shouldRefresh: () => {
    const { lastRefreshed } = get();
    if (!lastRefreshed) return true;
    
    // Check if 30 minutes have passed
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - lastRefreshed > thirtyMinutes;
  },
});