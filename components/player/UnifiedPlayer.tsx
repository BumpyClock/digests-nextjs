"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  X, 
  Volume2, 
  ChevronDown, 
  ChevronUp,
  SkipBack,
  SkipForward,
  Volume1,
  VolumeX
} from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  useUnifiedAudioStore,
  PlayerMode
} from "@/store/useUnifiedAudioStore";

interface UnifiedPlayerProps {
  className?: string;
  mode?: "inline" | "mini";
  minimizable?: boolean;
  maximizable?: boolean;
  onModeChange?: (mode: "inline" | "mini") => void;
}

/**
 * Unified Audio Player Component
 * 
 * This component handles playback for both TTS and audio content
 * in either inline or mini mode.
 */
export function UnifiedPlayer({
  className = "",
  mode = "inline",
  minimizable = true,
  maximizable = true,
  onModeChange
}: UnifiedPlayerProps) {
  // Use local state to avoid re-render issues
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    formattedTime: { current: '0:00', duration: '0:00' },
    playbackRate: 1,
    volume: 1,
    playerMode: mode === "mini" ? PlayerMode.MINI : PlayerMode.INLINE,
    isVisible: true,
    currentContent: null as any,
    contentType: 'none' as any
  });
  
  // Subscribe to store changes using a single effect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial state from store
    const store = useUnifiedAudioStore.getState();
    setPlayerState({
      isPlaying: store.isPlaying,
      isPaused: store.isPaused,
      isLoading: store.isLoading,
      progress: store.progress,
      currentTime: store.currentTime,
      duration: store.duration,
      formattedTime: store.getFormattedTime(),
      playbackRate: store.settings.playbackRate,
      volume: store.settings.volume,
      playerMode: store.playerMode,
      isVisible: store.isVisible,
      currentContent: store.currentContent,
      contentType: store.contentType
    });
    
    // Subscribe to changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      state => ({
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        isLoading: state.isLoading,
        progress: state.progress,
        currentTime: state.currentTime,
        duration: state.duration,
        formattedTime: state.getFormattedTime(),
        playbackRate: state.settings.playbackRate,
        volume: state.settings.volume,
        playerMode: state.playerMode,
        isVisible: state.isVisible,
        currentContent: state.currentContent,
        contentType: state.contentType
      }),
      newState => {
        setPlayerState(newState);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Extract variables from local state for convenience
  const {
    isPlaying,
    isPaused,
    isLoading,
    progress,
    currentTime,
    duration,
    formattedTime,
    playbackRate,
    volume,
    playerMode,
    isVisible,
    currentContent,
    contentType
  } = playerState;
  
  // Create stable action functions using the store directly
  const storeActions = React.useRef({
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
    seek: (time: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().seek(time);
    },
    setPlaybackRate: (rate: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setPlaybackRate(rate);
    },
    setVolume: (vol: number) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setVolume(vol);
    },
    setPlayerMode: (mode: PlayerMode) => {
      if (typeof window === 'undefined') return;
      useUnifiedAudioStore.getState().setPlayerMode(mode);
    }
  }).current;

  // Local state for better UI control
  const [mounted, setMounted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Handle player visibility - isVisible is already defined above from playerState
  const isMini = mode === "mini" || playerMode === PlayerMode.MINI;
  const shouldDisplay = playerMode !== PlayerMode.DISABLED && (
    (mode === "inline" && playerMode === PlayerMode.INLINE) ||
    (mode === "mini" && playerMode === PlayerMode.MINI) ||
    // Allow inline component to show mini player if requested
    (mode === "inline" && playerMode === PlayerMode.MINI && !maximizable)
  );
  
  // Skip intervals in seconds
  const SKIP_BACK_INTERVAL = contentType === 'article' ? 10 : 15;
  const SKIP_FORWARD_INTERVAL = contentType === 'article' ? 10 : 30;
  
  // Available playback rates
  const availableRates = [0.75, 1, 1.25, 1.5, 2];

  // Handle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      storeActions.pause();
    } else {
      storeActions.resume();
    }
  }, [isPlaying, storeActions]);
  
  // Skip backward/forward
  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - SKIP_BACK_INTERVAL);
    storeActions.seek(newTime);
  }, [currentTime, SKIP_BACK_INTERVAL, storeActions]);
  
  const skipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + SKIP_FORWARD_INTERVAL);
    storeActions.seek(newTime);
  }, [currentTime, duration, SKIP_FORWARD_INTERVAL, storeActions]);
  
  // Handle mode changes
  const handleMinimize = useCallback(() => {
    if (onModeChange) {
      onModeChange("mini");
    }
    storeActions.setPlayerMode(PlayerMode.MINI);
  }, [onModeChange, storeActions]);
  
  const handleMaximize = useCallback(() => {
    if (onModeChange) {
      onModeChange("inline");
    }
    storeActions.setPlayerMode(PlayerMode.INLINE);
  }, [onModeChange, storeActions]);
  
  // Handle slider changes
  const handleSeek = useCallback((values: number[]) => {
    const seekTime = (values[0] / 100) * duration;
    storeActions.seek(seekTime);
  }, [duration, storeActions]);
  
  const handleVolumeChange = useCallback((values: number[]) => {
    storeActions.setVolume(values[0] / 100);
  }, [storeActions]);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Remove unnecessary debug logs that could cause re-renders
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Only log on initial mount to avoid unnecessary work during renders
      console.log(`UnifiedPlayer mounted - Mode: ${mode}`);
    }
  }, [mode]);
  
  // Check for server-side rendering
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Show a placeholder UI if we're not ready to play yet but should be displaying
  // This solves the delayed appearance problem by showing UI immediately
  if (!currentContent) {
    if (shouldDisplay) {
      // Return placeholder UI that looks like the player but isn't functional yet
      return mode === "inline" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`transition-all duration-300 ease-in-out ${className}`}
        >
          <Card className="mb-4 mt-4 shadow-md relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-center py-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">Preparing audio player...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        // Mini player placeholder
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-2 shadow-lg"
        >
          <div className="flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-muted-foreground">Preparing audio player...</span>
          </div>
        </motion.div>
      );
    }
    return null;
  }
  
  // Check visibility based on shouldDisplay
  if (!shouldDisplay) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`UnifiedPlayer not displaying - mode: ${mode}, playerMode: ${playerMode}`);
    }
    return null;
  }
  
  // Handle the inline player display
  if (mode === "inline") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`transition-all duration-300 ease-in-out transform ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          } ${className}`}
        >
          <Card className="mb-4 mt-4 shadow-md relative overflow-hidden">
            <CardContent className="p-4">
              {/* Content Info */}
              {currentContent.thumbnail && (
                <div className="flex items-center mb-4 gap-3">
                  <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={currentContent.thumbnail}
                      alt={currentContent.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 truncate">
                    <h4 className="text-sm font-medium truncate">{currentContent.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{currentContent.source}</p>
                  </div>
                </div>
              )}
              
              {/* Main Controls */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipBackward}
                      className="h-8 w-8 hover:bg-primary/10 transition-colors"
                      aria-label={`Skip back ${SKIP_BACK_INTERVAL} seconds`}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayback}
                      className="h-10 w-10 hover:bg-primary/10 transition-colors"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipForward}
                      className="h-8 w-8 hover:bg-primary/10 transition-colors"
                      aria-label={`Skip forward ${SKIP_FORWARD_INTERVAL} seconds`}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <Slider
                    value={[progress * 100]}
                    max={100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                    aria-label="Playback progress"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{formattedTime.current}</span>
                    <span>{formattedTime.duration}</span>
                  </div>
                </div>

                {/* Volume controls */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVolumeSlider(prev => !prev)}
                    className="h-8 w-8 hover:bg-primary/10 transition-colors"
                    aria-label="Volume"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {showVolumeSlider && (
                    <div className="absolute bottom-full left-0 mb-2 bg-background rounded-md shadow-md p-3 w-[120px]">
                      <Slider
                        value={[volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        orientation="vertical"
                        className="h-[100px]"
                        aria-label="Volume"
                      />
                    </div>
                  )}
                </div>
                
                {/* Playback rate */}
                <div className="flex gap-1 text-sm">
                  {availableRates.map((rate) => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={rate}
                      onClick={() => storeActions.setPlaybackRate(rate)}
                      className={`px-2 py-1 rounded transition-colors ${
                        rate === playbackRate
                          ? "bg-primary/10 font-bold text-primary"
                          : "hover:bg-secondary"
                      }`}
                      aria-label={`Set playback rate to ${rate}x`}
                    >
                      {rate}x
                    </motion.button>
                  ))}
                </div>

                {/* Mode toggle buttons */}
                {minimizable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMinimize}
                    className="h-8 w-8 hover:bg-primary/10 transition-colors"
                    aria-label="Minimize player"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={storeActions.stop}
                  className="h-8 w-8 hover:bg-red-500/10 transition-colors text-red-500"
                  aria-label="Stop playback"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>

            {/* Progress indicator overlay */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-primary transition-all"
              style={{ width: `${progress * 100}%` }}
              aria-hidden="true"
            />
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }
  
  // Mini Player
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-2 shadow-lg"
      >
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          {/* Thumbnail and info (hidden on small screens) */}
          <div className="hidden md:flex items-center space-x-3 max-w-[200px]">
            {currentContent.thumbnail && (
              <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={currentContent.thumbnail}
                  alt={currentContent.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 truncate">
              <h4 className="text-sm font-medium truncate">{currentContent.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentContent.source}</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 md:ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBackward}
              className="h-8 w-8 hover:bg-primary/10 transition-colors"
              aria-label={`Skip back ${SKIP_BACK_INTERVAL} seconds`}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-8 w-8 hover:bg-primary/10 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={skipForward}
              className="h-8 w-8 hover:bg-primary/10 transition-colors"
              aria-label={`Skip forward ${SKIP_FORWARD_INTERVAL} seconds`}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress slider */}
          <div className="flex-1 flex flex-col">
            <Slider
              value={[progress * 100]}
              max={100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              aria-label="Progress"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{formattedTime.current}</span>
              <span>{formattedTime.duration}</span>
            </div>
          </div>

          {/* Playback rate (collapsed on smaller screens) */}
          <div className="hidden sm:flex gap-1 text-sm">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => storeActions.setPlaybackRate(playbackRate === 1 ? 1.5 : 1)}
              className={`px-2 py-1 rounded transition-colors bg-primary/10 font-medium text-primary hover:bg-primary/20`}
              aria-label={`Playback speed ${playbackRate}x`}
            >
              {playbackRate}x
            </motion.button>
          </div>

          {/* Action buttons */}
          {maximizable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMaximize}
              className="h-8 w-8 hover:bg-primary/10 transition-colors"
              aria-label="Maximize player"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={storeActions.stop}
            className="h-8 w-8 hover:bg-red-500/10 transition-colors"
            aria-label="Stop playback"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress indicator overlay */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-primary transition-all"
          style={{ width: `${progress * 100}%` }}
          aria-hidden="true"
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default UnifiedPlayer;