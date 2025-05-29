"use client"

import type React from "react"
import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react"

/**
 * Interface representing audio information
 */
interface AudioInfo {
  id: string
  title: string
  source: string
  audioUrl: string
  image?: string
}

/**
 * Context type definition for the audio functionality
 */
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

/**
 * Hook to access the audio context
 * @throws Error if used outside of AudioProvider
 */
export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider")
  }
  return context
}

/**
 * Provider component that manages audio state and functionality
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<AudioInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | undefined>(undefined)

  /**
   * Plays the selected audio or toggles play/pause if already selected
   */
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

  /**
   * Toggles between play and pause states
   */
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  /**
   * Seeks to a specific position in the audio track
   */
  const seek = useCallback((value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value
      setCurrentTime(value)
    }
  }, [])

  /**
   * Updates volume and mute state
   */
  const updateVolume = useCallback((value: number) => {
    setVolume(value)
    setIsMuted(value === 0)
  }, [])

  /**
   * Toggles mute state
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  /**
   * Toggles between minimized and full player views
   */
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  /**
   * Updates current playback time and schedules next update
   */
  const updateTime = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      animationRef.current = requestAnimationFrame(updateTime)
    }
  }, [])

  /**
   * Handles play/pause state changes
   */
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

  /**
   * Updates audio volume when volume or mute state changes
   */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  /**
   * Handles metadata loading for audio duration
   */
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  /**
   * Memoized context value to prevent unnecessary renders
   */
  const value = useMemo(() => ({
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
  }), [
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
    updateVolume,
    toggleMute,
    toggleMinimize
  ])

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

