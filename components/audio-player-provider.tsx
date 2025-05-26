"use client"

import React, { createContext, useContext } from "react"
import { AudioInfo } from "@/types"
import { useUnifiedAudioStore, PlayerMode } from "@/store/useUnifiedAudioStore"

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
  // Use individual selectors to avoid creating new objects
  const isPlaying = useUnifiedAudioStore(state => state.isPlaying);
  const isPaused = useUnifiedAudioStore(state => state.isPaused);
  const currentTime = useUnifiedAudioStore(state => state.currentTime);
  const duration = useUnifiedAudioStore(state => state.duration);
  const volume = useUnifiedAudioStore(state => state.settings.volume);
  const playerMode = useUnifiedAudioStore(state => state.playerMode);
  const currentContent = useUnifiedAudioStore(state => state.currentContent);
  
  // Map the new system to the old API
  const audioPlayerValue: AudioPlayerContextType = {
    // State
    currentAudio: currentContent ? {
      id: currentContent.id,
      title: currentContent.title,
      source: currentContent.source,
      audioUrl: currentContent.audioUrl || '',
      image: currentContent.thumbnail,
      isTTS: currentContent.type === 'article'
    } : null,
    isPlaying: isPlaying,
    duration: duration,
    currentTime: currentTime,
    volume: volume,
    isMuted: volume === 0,
    isMinimized: playerMode === PlayerMode.MINI,
    showMiniPlayer: playerMode !== PlayerMode.DISABLED,
    
    // Functions - use store methods directly
    playAudio: (audioInfo: AudioInfo) => {
      if (typeof window === 'undefined') return;
      
      if (audioInfo.isTTS) {
        // This would need text content, which we don't have in the old API
        console.warn("TTS playback through old API is not fully supported");
      } else {
        useUnifiedAudioStore.getState().loadContent({
          id: audioInfo.id,
          title: audioInfo.title,
          source: audioInfo.source,
          thumbnail: audioInfo.image,
          audioUrl: audioInfo.audioUrl || "",
          autoplay: true
        });
      }
    },
    togglePlayPause: () => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      
      if (store.isPlaying) {
        store.pause();
      } else {
        store.resume();
      }
    },
    seek: (value: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().seek(value);
    },
    setVolume: (value: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setVolume(value);
    },
    toggleMute: () => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      
      if (store.settings.volume > 0) {
        store.setVolume(0);
      } else {
        store.setVolume(1);
      }
    },
    toggleMinimize: () => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      
      store.setPlayerMode(
        store.playerMode === PlayerMode.MINI ? PlayerMode.INLINE : PlayerMode.MINI
      );
    },
    setShowMiniPlayer: (show: boolean) => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      
      if (show) {
        store.setPlayerMode(PlayerMode.MINI);
      } else {
        store.setPlayerMode(PlayerMode.DISABLED);
      }
    }
  };
  
  return (
    <AudioPlayerContext.Provider value={audioPlayerValue}>
      {children}
    </AudioPlayerContext.Provider>
  )
}