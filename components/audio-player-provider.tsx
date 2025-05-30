"use client"

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AudioControls } from "@/components/AudioControls"
import { AudioMiniPlayer } from "@/components/AudioMiniPlayer"
import Image from "next/image"
interface AudioInfo {
  id: string
  title: string
  source: string
  audioUrl: string
  image?: string
}

interface AudioPlayerContextType {
  currentAudio: AudioInfo | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isMuted: boolean
  isMinimized: boolean
  showMiniPlayer: boolean
  playAudio: (audioInfo: AudioInfo) => void
  togglePlayPause: () => void
  seek: (value: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleMinimize: () => void
  setShowMiniPlayer: (show: boolean) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return context
}

export const useAudio = useAudioPlayer

const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAudio, setCurrentAudio] = useState<AudioInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showMiniPlayer, setShowMiniPlayer] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | undefined>(undefined)

  const playAudio = useCallback((audioInfo: AudioInfo) => {
    setCurrentAudio((prev) => {
      if (prev && prev.id === audioInfo.id) {
        setIsPlaying((prevPlaying) => !prevPlaying)
        return prev
      }
      setIsPlaying(true)
      setShowMiniPlayer(true)
      setIsMinimized(true)
      return audioInfo
    })
  }, [])

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        setShowMiniPlayer(true)
      }
      return !prev
    })
  }, [])

  const seek = useCallback((value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value
      setCurrentTime(value)
    }
  }, [])

  const updateVolume = useCallback((value: number) => {
    setVolume(value)
    setIsMuted(value === 0)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  const setShowMiniPlayerHandler = useCallback((show: boolean) => {
    setShowMiniPlayer(show)
  }, [])

  const updateTime = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      animationRef.current = requestAnimationFrame(updateTime)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error)
          setIsPlaying(false)
        })
        animationRef.current = requestAnimationFrame(updateTime)
      } else {
        audioRef.current.pause()
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, updateTime])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      currentAudio,
      isPlaying,
      duration,
      currentTime,
      volume,
      isMuted,
      isMinimized,
      showMiniPlayer,
      playAudio,
      togglePlayPause,
      seek,
      setVolume: updateVolume,
      toggleMute,
      toggleMinimize,
      setShowMiniPlayer: setShowMiniPlayerHandler,
    }),
    [
      currentAudio,
      isPlaying,
      duration,
      currentTime,
      volume,
      isMuted,
      isMinimized,
      showMiniPlayer,
      playAudio,
      togglePlayPause,
      seek,
      updateVolume,
      toggleMute,
      toggleMinimize,
      setShowMiniPlayerHandler,
    ],
  )

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      {currentAudio && (
        <audio
          ref={audioRef}
          src={currentAudio.audioUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </AudioPlayerContext.Provider>
  )
}

const AudioControlsWrapper = React.memo(() => <AudioControls />)
AudioControlsWrapper.displayName = 'AudioControlsWrapper'


const AudioPlayer = React.memo(() => {
  const { currentAudio, isMinimized, showMiniPlayer } = useAudioPlayer()

  if (!currentAudio || !showMiniPlayer) return null

  if (isMinimized) {
    return <AudioMiniPlayer />
  }

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-40">
      <CardContent className="p-4 flex items-center">
        <div className="flex items-center flex-1">
          {currentAudio.image && (
            <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
              <Image
                src={currentAudio.image || "/placeholder-podcast.svg"}
                alt={currentAudio.title}
                className="w-full h-full object-cover"
                width={48}
                height={48}
              />
            </div>
          )}
          <div className="flex-1">
            <div className="font-medium truncate">{currentAudio.title}</div>
            <div className="text-xs text-muted-foreground">{currentAudio.source}</div>
          </div>
        </div>
        <AudioControlsWrapper />
      </CardContent>
    </Card>
  )
})

AudioPlayer.displayName = "AudioPlayer"

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <AudioPlayer />
    </AudioProvider>
  )
}

