"use client"

import React, { createContext, useContext } from "react"
import { AudioInfo } from "@/types"
import useAudioStore, { PlayerMode } from "@/store/useAudioStore"

// This file provides backward compatibility with the old AudioPlayerProvider
// It re-exports the old context API, but uses the new unified audio system internally

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

// Create a context with a default value
const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return context
}

// Alias for backward compatibility
export const useAudio = useAudioPlayer

// Provider component that wraps around the app
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  // Safe approach: use the raw Zustand store directly instead of hooks
  // This ensures we avoid the "getSnapshot" issue that occurs with multiple selector hooks
  // Access store state directly through the store instance

  // Function to get current state (safe for SSR)
  const getState = () => {
    if (typeof window === 'undefined') {
      return {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playerMode: PlayerMode.DISABLED,
        currentContent: null
      };
    }
    return useAudioStore.getState();
  };

  // Get current state once
  const state = getState();
  
  // Map the new system to the old API
  const audioPlayerValue: AudioPlayerContextType = {
    // State
    currentAudio: state.currentContent ? {
      id: state.currentContent.id,
      title: state.currentContent.title,
      source: state.currentContent.source,
      audioUrl: state.currentContent.audioUrl || '',
      image: state.currentContent.thumbnail,
      isTTS: state.currentContent.type === 'article',
      duration: state.duration
    } : null,
    isPlaying: state.isPlaying,
    duration: state.duration,
    currentTime: state.currentTime,
    volume: state.volume,
    isMuted: state.volume === 0,
    isMinimized: state.playerMode === PlayerMode.MINI,
    showMiniPlayer: state.playerMode !== PlayerMode.DISABLED,
    
    // Functions - use store methods directly
    playAudio: (audioInfo: AudioInfo) => {
      if (typeof window === 'undefined') return;
      
      if (audioInfo.isTTS) {
        // This would need text content, which we don't have in the old API
        console.warn("TTS playback through old API is not fully supported");
      } else {
        useAudioStore.getState().playAudio(audioInfo.audioUrl || "", {
          id: audioInfo.id,
          title: audioInfo.title,
          source: audioInfo.source,
          thumbnail: audioInfo.image
        });
      }
    },
    togglePlayPause: () => {
      if (typeof window === 'undefined') return;
      const store = useAudioStore.getState();
      
      if (store.isPlaying) {
        store.pause();
      } else {
        store.resume();
      }
    },
    seek: (value: number) => {
      if (typeof window === 'undefined') return;
      useAudioStore.getState().seek(value);
    },
    setVolume: (value: number) => {
      if (typeof window === 'undefined') return;
      useAudioStore.getState().setVolume(value);
    },
    toggleMute: () => {
      if (typeof window === 'undefined') return;
      const store = useAudioStore.getState();
      
      if (store.volume > 0) {
        store.setVolume(0);
      } else {
        store.setVolume(1);
      }
    },
    toggleMinimize: () => {
      if (typeof window === 'undefined') return;
      const store = useAudioStore.getState();
      
      store.setPlayerMode(
        store.playerMode === PlayerMode.MINI ? PlayerMode.INLINE : PlayerMode.MINI
      );
    },
    setShowMiniPlayer: (show: boolean) => {
      if (typeof window === 'undefined') return;
      const store = useAudioStore.getState();
      
      if (show) {
        store.setPlayerMode(PlayerMode.MINI);
      } else {
        store.setPlayerMode(PlayerMode.DISABLED);
      }
      store.setVisibility(show);
    }
  };
  
  return (
    <AudioPlayerContext.Provider value={audioPlayerValue}>
      {children}
    </AudioPlayerContext.Provider>
  )
}