"use client";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useFeedStore } from "@/store/useFeedStore";
import { formatTime } from "@/utils/audio";

/**
 * Component that renders audio playback controls
 */
export function AudioControls() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
  } = useFeedStore();

  /**
   * Memoized formatted time values to prevent recalculation
   */
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  /**
   * Handles seek slider value changes
   */
  const handleSeek = useCallback(
    (value: number[]) => {
      seek(value[0]);
    },
    [seek]
  );

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 mx-4 flex-1">
        <div className="text-caption w-10 text-right">{formattedCurrentTime}</div>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <div className="text-caption w-10">{formattedDuration}</div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={(value) => setVolume(value[0])}
          className="w-24"
        />
      </div>
    </div>
  );
}
