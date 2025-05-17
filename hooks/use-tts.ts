import { useCallback } from "react";
import { useTtsSettingsStore } from "@/store/useTtsSettingsStore";

export function useTTS() {
  const { provider } = useTtsSettingsStore();

  const speak = useCallback(
    (text: string) => {
      if (!text) return;
      switch (provider) {
        case "edge":
        default:
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
          break;
      }
    },
    [provider]
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, cancel };
}
