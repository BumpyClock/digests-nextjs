"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUnifiedAudioStore, PlayerMode } from "@/store/useUnifiedAudioStore";
import { shallow } from "zustand/shallow";

// Format time for display
export const formatTime = (milliseconds: number): string => {
  if (!milliseconds || isNaN(milliseconds)) return "0:00";
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// This is a legacy hook for compatibility with the existing code
export function useTTS() {
  // Use useState to store the values we get from Zustand
  const [state, setState] = useState(() => ({
    // Playback state
    isPlaying: false,
    isPaused: false,
    progress: 0,
    duration: 0,
    currentPosition: 0,
    playbackRate: 1,
    
    // UI state
    playerMode: PlayerMode.DISABLED,
    isVisible: false
  }));

  // Create stable function references that won't change between renders
  const functionRefs = useRef({
    play: async (text: string, metadata?: any) => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      return store.loadContent({
        id: metadata?.id || `tts-${Date.now()}`,
        title: metadata?.title || 'Text to Speech',
        source: metadata?.source || 'Article',
        thumbnail: metadata?.thumbnail,
        textContent: text,
        autoplay: true
      });
    },
    playInMode: async (text: string, mode: PlayerMode, metadata?: any) => {
      if (typeof window === 'undefined') return;
      const store = useUnifiedAudioStore.getState();
      store.setPlayerMode(mode);
      return store.loadContent({
        id: metadata?.id || `tts-${Date.now()}`,
        title: metadata?.title || 'Text to Speech',
        source: metadata?.source || 'Article',
        thumbnail: metadata?.thumbnail,
        textContent: text,
        autoplay: true
      });
    },
    pause: () => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().pause();
    },
    resume: () => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().resume();
    },
    stop: () => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().stop();
    },
    seek: (position: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().seek(position);
    },
    setPlaybackRate: (rate: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setPlaybackRate(rate);
    },
    setPlayerMode: (mode: PlayerMode) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setPlayerMode(mode);
    }
  });

  // Subscribe to store changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial state update
    setState({
      isPlaying: useUnifiedAudioStore.getState().isPlaying,
      isPaused: useUnifiedAudioStore.getState().isPaused,
      progress: useUnifiedAudioStore.getState().progress,
      duration: useUnifiedAudioStore.getState().duration,
      currentPosition: useUnifiedAudioStore.getState().currentTime,
      playbackRate: useUnifiedAudioStore.getState().settings.playbackRate,
      playerMode: useUnifiedAudioStore.getState().playerMode,
      isVisible: useUnifiedAudioStore.getState().isVisible
    });
    
    // Subscribe to changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      (state) => ({
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        progress: state.progress,
        duration: state.duration,
        currentPosition: state.currentTime,
        playbackRate: state.settings.playbackRate,
        playerMode: state.playerMode,
        isVisible: state.isVisible
      }),
      (newState) => {
        setState(newState);
      },
      { equalityFn: shallow }
    );
    
    return unsubscribe;
  }, []);
  
  // Memoized speak function with user-friendly modes
  const speak = useCallback((
    text: string, 
    mode: "inline" | "global" = "global",
    title?: string,
    source?: string,
    thumbnail?: string
  ) => {
    if (!text || typeof window === 'undefined') return;
    
    const targetMode = mode === "inline" ? PlayerMode.INLINE : PlayerMode.MINI;
    const metadata = {
      title: title || "Text-to-Speech",
      source: source || "Article",
      thumbnail: thumbnail || "/placeholder-rss.svg"
    };
    
    functionRefs.current.playInMode(text, targetMode, metadata);
  }, []);
  
  // Memoized seek function that works with percentages
  const seekByPercentage = useCallback((percentage: number) => {
    if (typeof window === 'undefined') return;
    const duration = state.duration;
    functionRefs.current.seek(percentage * duration);
  }, [state.duration]);
  
  // Return a stable API that won't cause re-renders
  return {
    // Direct state values
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    rate: state.playbackRate,
    duration: state.duration,
    playerMode: state.playerMode === PlayerMode.INLINE ? "inline" : "global",
    sliderValue: [state.progress],
    isVisible: state.isVisible,
    
    // Computed values
    timeValues: {
      currentTime: state.currentPosition,
      duration: state.duration
    },
    
    // Functions with stable references
    speak,
    pause: useCallback(() => functionRefs.current.pause(), []),
    resume: useCallback(() => functionRefs.current.resume(), []),
    stop: useCallback(() => functionRefs.current.stop(), []),
    seek: seekByPercentage,
    setRate: useCallback((rate: number) => functionRefs.current.setPlaybackRate(rate), []),
    setPlayerMode: useCallback((mode: "inline" | "global") => {
      functionRefs.current.setPlayerMode(mode === "inline" ? PlayerMode.INLINE : PlayerMode.MINI);
    }, [])
  };
}

export default useTTS;