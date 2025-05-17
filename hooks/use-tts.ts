import { useCallback, useRef, useState } from "react";
import { useTtsSettingsStore } from "@/store/useTtsSettingsStore";

interface TtsControls {
  isPlaying: boolean;
  progress: number;
  rate: number;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (percentage: number) => void;
  setRate: (rate: number) => void;
}

export function useTTS(): TtsControls {
  const { voice, rate, setRate } = useTtsSettingsStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef("");
  const charIndexRef = useRef(0);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setProgress(0);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      cancel();
      textRef.current = text;
      charIndexRef.current = 0;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      if (voice) {
        const voiceObj = window.speechSynthesis.getVoices().find((v) => v.name === voice);
        if (voiceObj) {
          utterance.voice = voiceObj;
        }
      }
      utterance.onboundary = (event) => {
        charIndexRef.current = event.charIndex;
        setProgress(charIndexRef.current / text.length);
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(1);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    },
    [cancel, rate, voice]
  );

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    cancel();
    utteranceRef.current = null;
    textRef.current = "";
  }, [cancel]);

  const seek = useCallback(
    (percentage: number) => {
      if (!textRef.current) return;
      const index = Math.floor(textRef.current.length * percentage);
      const remaining = textRef.current.slice(index);
      speak(remaining);
      setProgress(percentage);
    },
    [speak]
  );

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate);
      if (textRef.current) {
        const index = charIndexRef.current;
        const remaining = textRef.current.slice(index);
        speak(remaining);
      }
    },
    [setRate, speak]
  );

  return { isPlaying, progress, rate, speak, pause, resume, stop, seek, setRate: changeRate };
}
