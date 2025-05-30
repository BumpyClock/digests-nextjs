"use client"

import { useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, SkipBack, SkipForward, Repeat, X } from "lucide-react"
import { useFeedStore } from "@/store/useFeedStore"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"

/**
 * Compact audio player that appears minimized at the bottom of the screen
 */
export function AudioMiniPlayer() {
  const { currentAudio, isPlaying, togglePlayPause, currentTime, duration, seek, setShowMiniPlayer } = useFeedStore()

  /**
   * Formats time in seconds to MM:SS format
   */
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }, [])

  /**
   * Memoized formatted times to prevent recalculation
   */
  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [formatTime, currentTime])
  const formattedDuration = useMemo(() => formatTime(duration), [formatTime, duration])
  
  /**
   * Handles slider change for seeking
   */
  const handleSeek = useCallback(
    (value: number[]) => {
      seek(value[0])
    },
    [seek],
  )

  /**
   * Memoized toggle function to avoid recreation
   */
  const memoizedTogglePlayPause = useCallback(togglePlayPause, [togglePlayPause])

  /**
   * Handle close button click - stops audio and hides player
   */
  const handleClose = useCallback(() => {
    // Stop the audio playback
    if (isPlaying) {
      togglePlayPause()
    }
    setShowMiniPlayer(false)
  }, [setShowMiniPlayer, isPlaying, togglePlayPause])

  if (!currentAudio) return null

  return (
    <div className="fixed bottom-4 right-4 w-[640px] z-50 pointer-events-none">
      <Card
        id="audio-mini-player"
        className="border shadow-2xl rounded-[32px] backdrop-blur-[20px] pointer-events-auto !bg-card/70"
      >
        <CardContent className="p-4 flex gap-6">
          {/* Album Art - Only render if image exists - efficient conditional rendering */}
          {currentAudio.image && (
            <div className="w-[180px] h-[180px] overflow-hidden flex-shrink-0 rounded-[16px]">
              <Image
                src={currentAudio.image || "/placeholder.svg"}
                alt={currentAudio.title || "Album cover"}
                className="w-full h-full object-cover"
                loading="lazy" // Lazy loading for images - performance optimization
                width={180}
                height={180}
              />
            </div>
          )}

          {/* Content Stack */}
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Section */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-md font-bold mb-2 line-clamp-2">{currentAudio.title}</h2>
                <p className="text-xs opacity-75">{currentAudio.source}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close mini player"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                className="mb-1"
                onValueChange={handleSeek}
              />
              <div className="flex justify-between text-xs opacity-75">
                <span>{formattedCurrentTime}</span>
                <span>{formattedDuration}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Repeat className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 bg-white text-amber-950 rounded-full flex items-center justify-center hover:bg-white/90"
                onClick={memoizedTogglePlayPause} // Use memoized callback
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Repeat className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}