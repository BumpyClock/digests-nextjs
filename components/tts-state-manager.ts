"use client";

import { create } from "zustand";
import { TTSAudioAdapter } from "./tts-audio-adapter";

// Central state manager for TTS using Zustand
// This creates a single source of truth for TTS state that can be shared across components

interface TTSState {
  // State
  isPlaying: boolean;
  progress: number;
  rate: number;
  duration: number; // Estimated duration in seconds
  text: string;
  title: string;
  source: string;
  thumbnail: string;
  
  // Adapter reference
  adapter: TTSAudioAdapter | null;
  
  // Actions
  initialize: () => void;
  play: (text: string, title: string, source: string, thumbnail: string, rate?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (position: number) => void; // Position between 0-1
  setRate: (rate: number) => void;
  updateProgress: (progress: number) => void;
}

export const useTTSStore = create<TTSState>()((set, get) => ({
  // Initial state
  isPlaying: false,
  progress: 0,
  rate: 1,
  duration: 0,
  text: "",
  title: "",
  source: "",
  thumbnail: "",
  adapter: null,
  
  // Initialize the adapter
  initialize: () => {
    if (typeof window === "undefined") return;
    
    // Create adapter if it doesn't exist
    if (!get().adapter) {
      const adapter = new TTSAudioAdapter();
      
      // Set up adapter with callback to update progress
      adapter.onProgressUpdate = (progress: number) => {
        get().updateProgress(progress);
      };
      
      set({ adapter });
    }
  },
  
  // Play text
  play: (text, title, source, thumbnail, rate = 1) => {
    const { adapter } = get();
    if (!adapter || !text) return;
    
    // Store text and metadata
    set({ 
      text, 
      title, 
      source, 
      thumbnail, 
      isPlaying: true, 
      progress: 0,
      duration: Math.round(text.length / 15), // Rough estimate of duration (chars per second)
      rate
    });
    
    // Play via adapter
    adapter.play(text, rate);
  },
  
  // Pause playback
  pause: () => {
    const { adapter } = get();
    if (!adapter) return;
    
    adapter.pause();
    set({ isPlaying: false });
  },
  
  // Resume playback
  resume: () => {
    const { adapter } = get();
    if (!adapter) return;
    
    adapter.resume();
    set({ isPlaying: true });
  },
  
  // Stop playback
  stop: () => {
    const { adapter } = get();
    if (!adapter) return;
    
    adapter.stop();
    set({ isPlaying: false, progress: 0 });
  },
  
  // Seek to position
  seek: (position) => {
    const { adapter, text } = get();
    if (!adapter || !text) return;
    
    adapter.seek(position);
    set({ progress: position, isPlaying: true });
  },
  
  // Set playback rate
  setRate: (rate) => {
    const { adapter } = get();
    if (!adapter) return;
    
    adapter.setRate(rate);
    set({ rate });
  },
  
  // Update progress (called by adapter)
  updateProgress: (progress) => {
    // Throttle updates to reduce visual jitter (convert to percentage and round to nearest 0.5%)
    const roundedProgress = Math.round(progress * 200) / 200;
    
    // Only update if the change is significant enough to be visible
    const currentProgress = get().progress;
    const progressDiff = Math.abs(currentProgress - roundedProgress);
    
    if (progressDiff >= 0.005 || progress >= 0.999 || progress === 0) {
      set({ progress: roundedProgress });
      
      // If we've reached the end, update state
      if (progress >= 0.999) {
        set({ isPlaying: false });
      }
    }
  }
}));