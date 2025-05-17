import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

export type TtsProvider = "edge" | "gemini" | "openai";

interface TtsSettingsState {
  provider: TtsProvider;
  apiKeys: Record<string, string>;
  rate: number;
  setProvider: (provider: TtsProvider) => void;
  setApiKey: (provider: TtsProvider, key: string) => void;
  setRate: (rate: number) => void;
}

const DEFAULT_SETTINGS: TtsSettingsState = {
  provider: "edge",
  apiKeys: {},
  rate: 1,
  setProvider: () => {},
  setApiKey: () => {},
  setRate: () => {},
};

export const useTtsSettingsStore = create<TtsSettingsState>()(
  persist(
    (set, get) => ({
      provider: "edge",
      apiKeys: {},
      rate: 1,
      setProvider: (provider) => set({ provider }),
      setApiKey: (provider, key) =>
        set({ apiKeys: { ...get().apiKeys, [provider]: key } }),
      setRate: (rate) => set({ rate }),
    }),
    {
      name: "digests-tts-settings",
      storage: createJSONStorage(() => localforage),
    }
  )
);
