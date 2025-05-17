"use client";
import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { useTtsSettingsStore } from "@/store/useTtsSettingsStore";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, X } from "lucide-react";

interface TtsContextValue {
  isVisible: boolean;
  isPlaying: boolean;
  progress: number;
  rate: number;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  setRate: (rate: number) => void;
}

const TtsContext = createContext<TtsContextValue | undefined>(undefined);

export function useTTS() {
  const ctx = useContext(TtsContext);
  if (!ctx) throw new Error("useTTS must be used within TtsProvider");
  return ctx;
}

export function TtsProvider({ children }: { children: React.ReactNode }) {
  const { rate: storedRate, setRate: persistRate } = useTtsSettingsStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rate, setRateState] = useState(storedRate || 1);
  const textRef = useRef("");

  const speak = useCallback(
    (text: string) => {
      if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      textRef.current = text;
      setIsVisible(true);
      setIsPlaying(true);
      setProgress(0);
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.onboundary = (e) => {
        setProgress(e.charIndex / text.length);
      };
      utter.onend = () => {
        setIsPlaying(false);
        setProgress(1);
      };
      window.speechSynthesis.speak(utter);
    },
    [rate]
  );

  const pause = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsVisible(false);
    setProgress(0);
  }, []);

  const seek = useCallback(
    (p: number) => {
      if (typeof window === "undefined" || !textRef.current) return;
      const index = Math.floor(textRef.current.length * p);
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textRef.current.slice(index));
      utter.rate = rate;
      utter.onboundary = (e) => {
        setProgress((index + e.charIndex) / textRef.current.length);
      };
      utter.onend = () => {
        setIsPlaying(false);
        setProgress(1);
      };
      setProgress(index / textRef.current.length);
      setIsPlaying(true);
      window.speechSynthesis.speak(utter);
    },
    [rate]
  );

  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      persistRate(r);
    },
    [persistRate]
  );

  const value: TtsContextValue = {
    isVisible,
    isPlaying,
    progress,
    rate,
    speak,
    pause,
    resume,
    stop,
    seek,
    setRate,
  };

  return (
    <TtsContext.Provider value={value}>
      {children}
      {isVisible && <TtsPlayer />}
    </TtsContext.Provider>
  );
}

function TtsPlayer() {
  const { isPlaying, pause, resume, stop, progress, seek, rate, setRate } = useTTS();
  const toggle = () => (isPlaying ? pause() : resume());
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Slider
          value={[progress * 100]}
          max={100}
          step={1}
          onValueChange={(v) => seek(v[0] / 100)}
          className="flex-1"
        />
        <div className="flex gap-2 text-sm">
          {[1, 1.25, 1.5, 2].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={r === rate ? "font-bold" : ""}
            >
              {r}x
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={stop} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

