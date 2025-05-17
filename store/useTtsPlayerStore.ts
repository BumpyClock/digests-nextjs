"use client";

import { create } from "zustand";
import { useTTSStore } from "@/components/tts-state-manager";

/**
 * TTS Player Modes define where and how the TTS player is displayed
 */
export enum PlayerMode {
  INLINE = "inline",
  MINI = "mini",
  DISABLED = "disabled"
}

/**
 * Interface for TTS player state - focused on UI and mode management
 */
interface TtsPlayerState {
  // Current player mode
  playerMode: PlayerMode;
  
  // UI state
  isVisible: boolean;
  
  // Player settings
  autoMiniOnScroll: boolean;
  
  // Actions
  setPlayerMode: (mode: PlayerMode) => void;
  setVisible: (visible: boolean) => void;
  setAutoMiniOnScroll: (enabled: boolean) => void;
  
  // Mode transitions
  toggleMiniMode: () => void;
  disablePlayer: () => void;
  enableInlineMode: () => void;
  enableMiniMode: () => void;
}

/**
 * Interface for TTS playback state - focused on audio control
 */
interface TtsPlaybackState {
  // Current playback state
  isPlaying: boolean;
  isPaused: boolean;
  progress: number;
  duration: number;
  currentPosition: number;
  playbackRate: number;
  
  // Actions for controlling playback
  play: (text: string, title?: string, source?: string, thumbnail?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (position: number) => void;
  setPlaybackRate: (rate: number) => void;
}

/**
 * Store for TTS player UI mode management
 */
export const useTtsPlayerStore = create<TtsPlayerState>((set, get) => ({
  // Initial state
  playerMode: PlayerMode.DISABLED,
  isVisible: false,
  autoMiniOnScroll: true,
  
  // Mode setters
  setPlayerMode: (playerMode: PlayerMode) => {
    set({ 
      playerMode,
      isVisible: playerMode !== PlayerMode.DISABLED
    });
  },
  
  setVisible: (isVisible: boolean) => set({ isVisible }),
  
  setAutoMiniOnScroll: (autoMiniOnScroll: boolean) => set({ autoMiniOnScroll }),
  
  // Transition helpers
  toggleMiniMode: () => {
    const { playerMode } = get();
    if (playerMode === PlayerMode.INLINE) {
      set({ playerMode: PlayerMode.MINI });
    } else if (playerMode === PlayerMode.MINI) {
      set({ playerMode: PlayerMode.INLINE });
    }
  },
  
  disablePlayer: () => {
    set({ 
      playerMode: PlayerMode.DISABLED,
      isVisible: false
    });
  },
  
  enableInlineMode: () => {
    set({ 
      playerMode: PlayerMode.INLINE,
      isVisible: true
    });
  },
  
  enableMiniMode: () => {
    set({ 
      playerMode: PlayerMode.MINI,
      isVisible: true
    });
  }
}));

/**
 * Store adapter that connects the TTS engine to our player interface
 * This provides a consistent interface to control the TTS functionality
 */
export const useTtsPlayback = () => {
  // Get TTS state and controls from global TTS state
  const { 
    isPlaying,
    progress,
    duration,
    rate,
    text,
    title,
    source,
    thumbnail,
    
    // Actions
    play,
    pause,
    resume,
    stop,
    seek,
    setRate
  } = useTTSStore();
  
  // Calculate current position in milliseconds
  const currentPosition = Math.round(progress * duration * 1000);
  
  // Player mode management
  const { 
    playerMode,
    setPlayerMode
  } = useTtsPlayerStore();
  
  return {
    // Playback state
    isPlaying,
    isPaused: !isPlaying && text.length > 0,
    progress: progress * 100, // 0-100 for UI
    duration: duration * 1000, // milliseconds for UI
    currentPosition,
    playbackRate: rate,
    text,
    title,
    source,
    thumbnail,
    
    // Player mode
    playerMode,
    setPlayerMode,
    
    // Actions - wrapped for consistency
    play: (text: string, title?: string, source?: string, thumbnail?: string) => {
      play(text, title || "", source || "", thumbnail || "");
      
      // Auto-show player in INLINE mode when playing starts
      if (playerMode === PlayerMode.DISABLED) {
        setPlayerMode(PlayerMode.INLINE);
      }
    },
    
    pause,
    resume,
    
    stop: () => {
      stop();
      // Auto-hide player when stopped
      setPlayerMode(PlayerMode.DISABLED);
    },
    
    seek: (position: number) => seek(position / 1000), // Convert ms to seconds for the engine
    setPlaybackRate: setRate
  };
};

/**
 * Access to player mode control
 */
export const useTtsPlayerMode = () => {
  const { 
    playerMode,
    isVisible,
    autoMiniOnScroll,
    setPlayerMode,
    setVisible,
    setAutoMiniOnScroll,
    toggleMiniMode,
    disablePlayer,
    enableInlineMode,
    enableMiniMode
  } = useTtsPlayerStore();
  
  return {
    // State
    playerMode,
    isVisible,
    autoMiniOnScroll,
    
    // Derived state
    isInline: playerMode === PlayerMode.INLINE,
    isMini: playerMode === PlayerMode.MINI,
    isDisabled: playerMode === PlayerMode.DISABLED,
    
    // Actions
    setPlayerMode,
    setVisible,
    setAutoMiniOnScroll,
    toggleMiniMode,
    disablePlayer,
    enableInlineMode,
    enableMiniMode,
    
    // Constants
    PlayerMode
  };
};