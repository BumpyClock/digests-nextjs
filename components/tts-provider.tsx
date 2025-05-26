"use client";

import React, { ReactNode, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, X, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useTTS, formatTime } from "@/hooks/use-tts";
import { PlayerMode } from "@/store/useUnifiedAudioStore";
import TtsErrorHandler from "./tts-error-handler";

// Only import the Zustand store directly - don't use the selector hooks at the module level
import { useUnifiedAudioStore } from "@/store/useUnifiedAudioStore";

export { useTTS, formatTime };

interface TtsProviderProps {
  children: ReactNode;
}

/**
 * TTS Provider component that wraps children and provides a global TTS player when needed
 * Using memo to prevent unnecessary re-renders
 */
export const TtsProvider = memo(function TtsProvider({ children }: TtsProviderProps) {
  // Since useUnifiedAudioStore is a store instance, not a hook, we need to use React's useState and useEffect
  // to get and subscribe to the store values
  const [state, setState] = React.useState(() => ({
    isVisible: false,
    playerMode: PlayerMode.DISABLED,
    hasError: false
  }));
  
  // Subscribe to store changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial update
    setState({
      isVisible: useUnifiedAudioStore.getState().isVisible,
      playerMode: useUnifiedAudioStore.getState().playerMode,
      hasError: useUnifiedAudioStore.getState().error !== null
    });
    
    // Subscribe to changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      (state) => ({
        isVisible: state.isVisible,
        playerMode: state.playerMode,
        hasError: state.error !== null
      }),
      (newState) => {
        setState(newState);
      }
    );
    
    return unsubscribe;
  }, []);
  
  // Initialize on client-side only
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Only initialize if not already initialized
      if (!useUnifiedAudioStore.getState().isInitialized) {
        useUnifiedAudioStore.getState().initialize().catch(e => {
          console.error("Failed to initialize TTS:", e);
        });
      }
    }
  }, []);
  
  return (
    <>
      {state.hasError && <TtsErrorHandler />}
      {children}
      {state.isVisible && state.playerMode === PlayerMode.MINI && <GlobalTtsPlayer />}
    </>
  );
});

/**
 * Global TTS player that appears at the bottom of the screen
 * Using memo to prevent unnecessary re-renders
 */
export const GlobalTtsPlayer = memo(function GlobalTtsPlayer() {
  // Use useState and useEffect with store subscription
  const [state, setState] = React.useState(() => ({
    isPlaying: false,
    isPaused: false,
    progress: 0,
    duration: 0,
    currentPosition: 0,
    playbackRate: 1,
    currentArticle: null
  }));
  
  // Store references to functions to avoid recreating them
  const actionRef = React.useRef({
    pause: () => useUnifiedAudioStore.getState().pause(),
    resume: () => useUnifiedAudioStore.getState().resume(),
    stop: () => useUnifiedAudioStore.getState().stop(),
    seek: (pos: number) => useUnifiedAudioStore.getState().seek(pos),
    setPlaybackRate: (rate: number) => useUnifiedAudioStore.getState().setPlaybackRate(rate)
  });
  
  // Subscribe to store changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial update
    const currentState = useUnifiedAudioStore.getState();
    setState({
      isPlaying: currentState.isPlaying,
      isPaused: currentState.isPaused,
      progress: currentState.progress,
      duration: currentState.duration,
      currentPosition: currentState.currentTime,
      playbackRate: currentState.settings.playbackRate,
      currentArticle: currentState.currentContent
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
        currentArticle: state.currentContent
      }),
      (newState) => {
        setState(newState);
      }
    );
    
    return unsubscribe;
  }, []);
  
  // Stable toggle function
  const toggle = React.useCallback(() => {
    if (state.isPlaying) {
      actionRef.current.pause();
    } else {
      actionRef.current.resume();
    }
  }, [state.isPlaying]);
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-2 shadow-lg animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Volume2 className={`h-4 w-4 text-muted-foreground ml-1 ${state.isPlaying ? 'animate-pulse' : ''}`} />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggle} 
            className="h-8 w-8 hover:bg-primary/10 transition-colors"
            aria-label={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="hidden md:block text-sm font-medium truncate max-w-[150px]">
          {state.currentArticle?.title || "Text-to-Speech"}
        </div>
        
        <div className="flex-1 flex flex-col">
          <Slider
            value={[state.progress]}
            max={100}
            step={1}
            onValueChange={(v) => actionRef.current.seek((v[0] / 100) * state.duration)}
            className="flex-1"
            aria-label="Progress"
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{formatTime(state.currentPosition)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>
        
        <div className="flex gap-1 text-sm">
          {[1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => actionRef.current.setPlaybackRate(rate)}
              className={`px-2 py-1 rounded transition-colors ${
                rate === state.playbackRate 
                  ? "bg-primary/10 font-bold text-primary" 
                  : "hover:bg-secondary"
              }`}
              aria-label={`Set playback rate to ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => actionRef.current.stop()} 
          className="h-8 w-8 hover:bg-red-500/10 transition-colors"
          aria-label="Stop playback"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default TtsProvider;