import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

export type TtsProvider = "edge" | "gemini" | "openai";

interface TtsSettingsState {
  provider: TtsProvider;
  apiKeys: Record<string, string>;
  voice: string;
  rate: number;
  setProvider: (provider: TtsProvider) => void;
  setApiKey: (provider: TtsProvider, key: string) => void;
  setVoice: (voice: string) => void;
  setRate: (rate: number) => void;
}

const DEFAULT_SETTINGS: TtsSettingsState = {
  provider: "edge",
  apiKeys: {},
  voice: "",
  rate: 1,
  setProvider: () => {},
  setApiKey: () => {},
  setVoice: () => {},
  setRate: () => {},
};

export const useTtsSettingsStore = create<TtsSettingsState>()(
  persist(
    (set: any, get: any) => ({
      provider: "edge",
      apiKeys: {},
      voice: "",
      rate: 1,
      setProvider: (provider: TtsProvider) => set({ provider }),
      setApiKey: (provider: TtsProvider, key: string) =>
        set({ apiKeys: { ...get().apiKeys, [provider]: key } }),
      setVoice: (voice: string) => set({ voice }),
      setRate: (rate: number) => set({ rate }),
    }),
    {
      name: "digests-tts-settings",
      storage: createJSONStorage(() => localforage),
    }
  )
);
