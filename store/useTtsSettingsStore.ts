import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

export type TtsProvider = "edge" | "gemini" | "openai";

interface TtsSettingsState {
  provider: TtsProvider;
  apiKeys: Record<string, string>;
  setProvider: (provider: TtsProvider) => void;
  setApiKey: (provider: TtsProvider, key: string) => void;
}

const DEFAULT_SETTINGS: TtsSettingsState = {
  provider: "edge",
  apiKeys: {},
  setProvider: () => {},
  setApiKey: () => {},
};

export const useTtsSettingsStore = create<TtsSettingsState>()(
  persist(
    (set, get) => ({
      provider: "edge",
      apiKeys: {},
      setProvider: (provider) => set({ provider }),
      setApiKey: (provider, key) =>
        set({ apiKeys: { ...get().apiKeys, [provider]: key } }),
    }),
    {
      name: "digests-tts-settings",
      storage: createJSONStorage(() => localforage),
    }
  )
);
