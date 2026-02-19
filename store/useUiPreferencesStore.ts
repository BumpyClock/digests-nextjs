import localforage from "localforage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Font size scale: 0-4 (0 = smallest, 4 = largest)
export const FONT_SIZE_MIN = 0;
export const FONT_SIZE_MAX = 4;
const FONT_SIZE_DEFAULT = 2;

interface UiPreferencesState {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  compactView: boolean;
  setCompactView: (compact: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
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

      // Compact view (default: false)
      compactView: false,
      setCompactView: (compact: boolean) => {
        set({ compactView: compact });
      },

      // Font size scale (0-4, default: 2)
      fontSize: FONT_SIZE_DEFAULT,
      setFontSize: (size: number) => {
        const clampedSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
        set({ fontSize: clampedSize });
      },
      increaseFontSize: () => {
        set((state) => ({
          fontSize: Math.min(FONT_SIZE_MAX, state.fontSize + 1),
        }));
      },
      decreaseFontSize: () => {
        set((state) => ({
          fontSize: Math.max(FONT_SIZE_MIN, state.fontSize - 1),
        }));
      },
    }),
    {
      name: "digests-ui-preferences",
      storage: createJSONStorage(() => localforage),
    }
  )
);

