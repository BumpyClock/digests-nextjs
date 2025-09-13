// ABOUTME: Zustand slice managing audio playback state and actions for the app's audio player.
// ABOUTME: Provides state (current track, playback status, timing, UI flags) and handlers to control audio.
import { StateCreator } from "zustand"
import type { AudioInfo } from "@/components/AudioPlayer/types"
import { handleAudioError } from "@/utils/audio"

export interface AudioSlice {
  // State
  currentAudio: AudioInfo | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isMuted: boolean
  isMinimized: boolean
  showMiniPlayer: boolean

  // Actions
  playAudio: (audioInfo: AudioInfo) => void
  togglePlayPause: () => void
  seek: (value: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleMinimize: () => void
  setShowMiniPlayer: (show: boolean) => void
  setDuration: (duration: number) => void
  setCurrentTime: (time: number) => void
}

// Create a singleton audio element
const audioElement = typeof window !== 'undefined' ? new Audio() : null

export const createAudioSlice: StateCreator<AudioSlice, [], [], AudioSlice> = (set, get) => {
  // Set up audio element event listeners once
  if (audioElement) {
    audioElement.onloadedmetadata = () => {
      set({ duration: audioElement.duration })
    }

    audioElement.ontimeupdate = () => {
      set({ currentTime: audioElement.currentTime })
    }

    audioElement.onended = () => {
      set({ isPlaying: false })
    }
  }

  return {
    // Initial state
    currentAudio: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 1,
    isMuted: false,
    isMinimized: false,
    showMiniPlayer: false,

    // Actions
    playAudio: (audioInfo) => {
      if (!audioElement) return

      // Validate audio URL
      if (!audioInfo.audioUrl) {
        handleAudioError(new Error("No audio URL provided"), audioInfo.title)
        return
      }

      const currentAudio = get().currentAudio
      const isPlaying = get().isPlaying

      if (currentAudio && currentAudio.id === audioInfo.id) {
        // Toggle play/pause for the same audio
        set({ isPlaying: !isPlaying })
        if (!isPlaying) {
          audioElement.play().catch((error) => {
            handleAudioError(error, audioInfo.title)
            set({ isPlaying: false })
          })
        } else {
          audioElement.pause()
        }
        return
      }

      // Play new audio
      set({
        currentAudio: audioInfo,
        isPlaying: true,
        showMiniPlayer: true,
        isMinimized: true,
      })

      audioElement.src = audioInfo.audioUrl
      audioElement.volume = get().isMuted ? 0 : get().volume
      audioElement.play().catch((error) => {
        handleAudioError(error, audioInfo.title)
        set({ isPlaying: false })
      })
    },

    togglePlayPause: () => {
      if (!audioElement) return

      const isPlaying = get().isPlaying
      const showMiniPlayer = get().showMiniPlayer
      
      // If resuming playback, ensure mini player is shown
      if (!isPlaying && !showMiniPlayer) {
        set({ isPlaying: true, showMiniPlayer: true, isMinimized: true })
      } else {
        set({ isPlaying: !isPlaying })
      }

      if (!isPlaying) {
        audioElement.play().catch((error) => {
          handleAudioError(error, get().currentAudio?.title)
          set({ isPlaying: false })
        })
      } else {
        audioElement.pause()
      }
    },

    seek: (value) => {
      if (audioElement) {
        audioElement.currentTime = value
        set({ currentTime: value })
      }
    },

    setVolume: (value) => {
      set({ volume: value, isMuted: value === 0 })
      if (audioElement) {
        audioElement.volume = value
      }
    },

    toggleMute: () => {
      const isMuted = get().isMuted
      const volume = get().volume
      set({ isMuted: !isMuted })
      
      if (audioElement) {
        audioElement.volume = !isMuted ? 0 : volume
      }
    },

    toggleMinimize: () => {
      set((state: AudioSlice) => ({ isMinimized: !state.isMinimized }))
    },

    setShowMiniPlayer: (show) => {
      set({ showMiniPlayer: show })
    },

    setDuration: (duration) => {
      set({ duration })
    },

    setCurrentTime: (time) => {
      set({ currentTime: time })
    }
  }
}