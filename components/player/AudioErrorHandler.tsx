"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useUnifiedAudioStore } from "@/store/useUnifiedAudioStore";

interface AudioErrorHandlerProps {
  showToasts?: boolean;
}

/**
 * Audio Error Handler Component
 * 
 * This component monitors for audio errors and displays appropriate feedback.
 * It can be placed anywhere in the component tree and will handle errors globally.
 */
export function AudioErrorHandler({ showToasts = true }: AudioErrorHandlerProps) {
  // Use local state to track errors
  const [error, setError] = useState<null | { 
    code: string; 
    message: string; 
    recoverable: boolean;
    timestamp: number;
  }>(null);
  
  // Keep track of the last shown error to prevent duplicates
  const lastErrorRef = useRef<string | null>(null);
  
  // Subscribe to audio store errors
  useEffect(() => {
    // Skip for SSR
    if (typeof window === 'undefined') return;
    
    // Initial state
    const initialError = useUnifiedAudioStore.getState().error;
    if (initialError) {
      setError(initialError);
    }
    
    // Subscribe to error changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      state => state.error,
      (currentError) => {
        setError(currentError);
      }
    );
    
    return unsubscribe;
  }, []);
  
  // Show error toasts
  useEffect(() => {
    if (!error || !showToasts) return;
    
    // Skip if we've already shown this exact error code
    if (lastErrorRef.current === error.code) return;
    
    // Update last error
    lastErrorRef.current = error.code;
    
    // Get friendly error message
    const friendlyMessage = getFriendlyErrorMessage(error.code, error.message);
    
    // Show toast with appropriate actions
    if (error.recoverable) {
      toast.error(friendlyMessage.title, {
        description: friendlyMessage.description,
        action: {
          label: error.code === 'USER_INTERACTION_REQUIRED' ? "Try Again" : "Dismiss",
          onClick: () => {
            if (typeof window !== 'undefined') {
              // Clear the error in the store
              useUnifiedAudioStore.getState().clearError();
              
              // If it's a browser interaction error, we can try to resume playback
              if (error.code === 'USER_INTERACTION_REQUIRED') {
                setTimeout(() => {
                  const store = useUnifiedAudioStore.getState();
                  if (store.isPaused) {
                    store.resume();
                  }
                }, 500);
              }
            }
          }
        }
      });
    } else {
      toast.error(friendlyMessage.title, {
        description: friendlyMessage.description
      });
    }
    
    // Auto-clear error after toast is shown
    const timerId = setTimeout(() => {
      if (typeof window !== 'undefined') {
        useUnifiedAudioStore.getState().clearError();
      }
    }, 5000);
    
    return () => clearTimeout(timerId);
  }, [error, showToasts]);
  
  // This component doesn't render anything
  return null;
}

/**
 * Get a user-friendly error message based on error code
 */
function getFriendlyErrorMessage(code: string, originalMessage: string): { title: string; description: string } {
  switch (code) {
    // TTS errors
    case 'NOT_SUPPORTED':
      return {
        title: "Text-to-speech unavailable",
        description: "Your browser doesn't support text-to-speech functionality."
      };
    case 'INITIALIZATION_FAILED':
      return {
        title: "TTS initialization failed",
        description: "Could not initialize the text-to-speech engine. Try refreshing the page."
      };
    case 'SPEECH_ERROR':
      return {
        title: "Speech playback error",
        description: "There was a problem with the text-to-speech playback."
      };
      
    // Audio errors
    case 'PLAYBACK_ABORTED':
      return {
        title: "Playback stopped",
        description: "Audio playback was interrupted."
      };
    case 'NETWORK_ERROR':
      return {
        title: "Network error",
        description: "Could not load audio due to network issues. Check your connection and try again."
      };
    case 'DECODE_ERROR':
      return {
        title: "Audio format problem",
        description: "Could not decode the audio file. The format may be unsupported or the file may be corrupted."
      };
    case 'FORMAT_ERROR':
      return {
        title: "Unsupported format",
        description: "This audio format is not supported by your browser."
      };
      
    // General errors
    case 'LOAD_ERROR':
      return {
        title: "Loading error",
        description: "Could not load the audio content. Please try again."
      };
    case 'PLAY_ERROR':
      return {
        title: "Playback error",
        description: "Could not play the audio content. Please try again."
      };
    case 'USER_INTERACTION_REQUIRED':
      return {
        title: "Action required",
        description: "Please interact with the page to enable audio playback."
      };
      
    // Default/unknown errors
    default:
      return {
        title: "Audio error",
        description: originalMessage || "An unknown error occurred with audio playback."
      };
  }
}

export default AudioErrorHandler;