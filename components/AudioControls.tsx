"use client"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { useAudio } from "./AudioContext"

export function AudioControls() {
  const { isPlaying, currentTime, duration, volume, isMuted, togglePlayPause, seek, setVolume, toggleMute } = useAudio()

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 mx-4 flex-1">
        <div className="text-xs w-10 text-right">{formatTime(currentTime)}</div>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={(value) => seek(value[0])}
          className="flex-1"
        />
        <div className="text-xs w-10">{formatTime(duration)}</div>
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
  )
}

