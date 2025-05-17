"use client";

import React, { useEffect, ReactNode, useState } from "react";
import useAudioStore, { PlayerMode } from "@/store/useAudioStore";
import dynamic from 'next/dynamic';

// Dynamically import components with no SSR to avoid hydration issues
const AudioErrorHandler = dynamic(
  () => import('./AudioErrorHandler'),
  { ssr: false }
);

// Dynamically import the mini player with no SSR to avoid hydration issues
const MiniPlayer = dynamic(
  () => import('./UnifiedPlayer').then(mod => ({ 
    default: (props: any) => <mod.default {...props} />
  })),
  { ssr: false }
);

interface AudioProviderProps {
  children: ReactNode;
}

/**
 * Audio Provider Component
 * 
 * This component initializes the audio system and provides the global
 * mini player component when needed. It should be placed near the root
 * of your application.
 */
export function AudioProvider({ children }: AudioProviderProps) {
  // State to track if client-side has mounted
  const [mounted, setMounted] = useState(false);
  
  // Initialize audio system on client side only
  useEffect(() => {
    // Skip for SSR
    if (typeof window === 'undefined') return;
    
    // Set mounted state
    setMounted(true);
    
    // Initialize audio system
    const initializeAudio = async () => {
      try {
        // Access the store directly to avoid hooks in effects
        const store = useAudioStore.getState();
        await store.initialize();
      } catch (error) {
        console.error("Failed to initialize audio system:", error);
      }
    };
    
    initializeAudio();
    
    // Handle page visibility change (pause when tab is hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pause playback when page is not visible
        const store = useAudioStore.getState();
        if (store.isPlaying) {
          console.log('Page hidden, pausing audio playback');
          store.pause();
        }
      }
    };
    
    // Handle page unload (stop when navigating away entirely)
    const handleBeforeUnload = () => {
      const store = useAudioStore.getState();
      if (store.isPlaying || store.isPaused) {
        console.log('Page unloading, stopping audio playback');
        store.stop();
      }
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        // Remove event listeners
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Clean up audio system
        useAudioStore.getState().cleanup();
      }
    };
  }, []);
  
  // Handle mode changes for the mini player
  const handleModeChange = (mode: "inline" | "mini") => {
    if (typeof window === 'undefined') return;
    
    const store = useAudioStore.getState();
    if (mode === "inline") {
      store.setPlayerMode(PlayerMode.INLINE);
    } else if (mode === "mini") {
      store.setPlayerMode(PlayerMode.MINI);
    }
  };
  
  return (
    <>
      {/* Only show components when client-side mounted to avoid hydration issues */}
      {mounted && (
        <>
          {/* Error handler for toasts */}
          <AudioErrorHandler />
          
          {/* Global mini player - client-side only */}
          <MiniPlayer 
            mode="mini" 
            maximizable={true} 
            onModeChange={handleModeChange}
          />
        </>
      )}
      
      {/* The app content */}
      {children}
    </>
  );
}

export default AudioProvider;