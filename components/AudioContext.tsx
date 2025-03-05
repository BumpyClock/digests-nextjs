"use client"

import type React from "react"
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react"

interface AudioInfo {
  id: string
  title: string
  source: string
  audioUrl: string
  image?: string
}

interface AudioContextType {
  currentAudio: AudioInfo | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isMuted: boolean
  isMinimized: boolean
  playAudio: (audioInfo: AudioInfo) => void
  togglePlayPause: () => void
  seek: (value: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleMinimize: () => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider")
  }
  return context
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<AudioInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number>()

  const playAudio = useCallback(
    (audioInfo: AudioInfo) => {
      if (currentAudio && currentAudio.id === audioInfo.id) {
        setIsPlaying(!isPlaying)
      } else {
        setCurrentAudio(audioInfo)
        setIsPlaying(true)
      }
    },
    [currentAudio, isPlaying],
  )

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
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

  const value = {
    currentAudio,
    isPlaying,
    duration,
    currentTime,
    volume,
    isMuted,
    isMinimized,
    playAudio,
    togglePlayPause,
    seek,
    setVolume: updateVolume,
    toggleMute,
    toggleMinimize,
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
      {currentAudio && (
        <audio
          ref={audioRef}
          src={currentAudio.audioUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </AudioContext.Provider>
  )
}

