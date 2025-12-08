import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

interface UiPreferencesState {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      // Default to true (animations enabled)
      animationsEnabled: true,

      // Toggle animations
      setAnimationsEnabled: (enabled: boolean) => {
        set({ animationsEnabled: enabled });
      },
    }),
    {
      name: "digests-ui-preferences",
      storage: createJSONStorage(() => localforage),
    }
  )
);

// Helper function to get animation preference without hook
export function getAnimationsEnabled(): boolean {
  return useUiPreferencesStore.getState().animationsEnabled;
}
