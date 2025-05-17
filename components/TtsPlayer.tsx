"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play, X } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";

interface TtsPlayerProps {
  text: string;
  onClose: () => void;
}

export function TtsPlayer({ text, onClose }: TtsPlayerProps) {
  const { isPlaying, progress, rate, speak, pause, resume, stop, seek, setRate } = useTTS();

  useEffect(() => {
    speak(text);
    return stop;
  }, [text, speak, stop]);

  const toggle = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const speeds = [1, 1.25, 1.5, 2];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur border-t p-4">
      <div className="flex items-center gap-4">
        <Button size="icon" variant="ghost" onClick={toggle}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Slider
          value={[progress * 100]}
          max={100}
          step={1}
          onValueChange={(val) => seek(val[0] / 100)}
          className="flex-1"
        />
        <div className="flex items-center gap-2 text-sm">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setRate(s)}
              className={rate === s ? "font-semibold" : "opacity-70 hover:opacity-100"}
            >
              {s}x
            </button>
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            stop();
            onClose();
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
