import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"
import type { AudioInfo } from "@/components/AudioPlayer/types"

interface AudioState {
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

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
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

        set((state) => {
          if (state.currentAudio && state.currentAudio.id === audioInfo.id) {
            return { isPlaying: !state.isPlaying }
          }
          return {
            currentAudio: audioInfo,
            isPlaying: true,
            showMiniPlayer: true,
            isMinimized: true,
          }
        })

        // Set up audio element
        audioElement.src = audioInfo.audioUrl
        audioElement.volume = get().isMuted ? 0 : get().volume

        // Set up event listeners
        audioElement.onloadedmetadata = () => {
          set({ duration: audioElement.duration })
        }

        audioElement.ontimeupdate = () => {
          set({ currentTime: audioElement.currentTime })
        }

        audioElement.onended = () => {
          set({ isPlaying: false })
        }

        // Start playing
        audioElement.play().catch((error) => {
          console.error("Error playing audio:", error)
          set({ isPlaying: false })
        })
      },

      togglePlayPause: () => {
        if (!audioElement) return

        set((state) => {
          if (!state.isPlaying) {
            audioElement.play().catch((error) => {
              console.error("Error playing audio:", error)
              return { isPlaying: false }
            })
            return { isPlaying: true, showMiniPlayer: true }
          } else {
            audioElement.pause()
            return { isPlaying: false }
          }
        })
      },

      seek: (value) => {
        if (!audioElement) return
        audioElement.currentTime = value
        set({ currentTime: value })
      },

      setVolume: (value) => {
        if (!audioElement) return
        audioElement.volume = value
        set({ volume: value, isMuted: value === 0 })
      },

      toggleMute: () => {
        if (!audioElement) return
        set((state) => {
          const newMuted = !state.isMuted
          audioElement.volume = newMuted ? 0 : state.volume
          return { isMuted: newMuted }
        })
      },

      toggleMinimize: () => {
        set((state) => ({ isMinimized: !state.isMinimized }))
      },

      setShowMiniPlayer: (show) => {
        set({ showMiniPlayer: show })
      },

      setDuration: (duration) => {
        set({ duration })
      },

      setCurrentTime: (time) => {
        set({ currentTime: time })
      },
    }),
    {
      name: "digests-audio-store",
      version: 1,
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isMinimized: state.isMinimized,
      }),
    }
  )
)