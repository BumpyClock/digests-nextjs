"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, X, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useTtsStore, PlayerMode } from "@/store/useTtsStore";
import { shallow } from "zustand/shallow";

interface InlineTtsPlayerProps {
  className?: string;
  minimizable?: boolean;
  onMinimize?: () => void;
}

export function InlineTtsPlayer({ 
  className = "", 
  minimizable = false,
  onMinimize
}: InlineTtsPlayerProps) {
  // Use React state for managing TTS state to avoid Zustand hook issues
  const [playerState, setPlayerState] = useState(() => ({
    isPlaying: false,
    isPaused: false,
    progress: 0,
    duration: 0,
    currentPosition: 0,
    playbackRate: 1,
    playerMode: PlayerMode.DISABLED
  }));
  
  const [mounted, setMounted] = useState(false);
  
  // Create stable function references
  const stableFunctions = useRef({
    pause: () => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().pause();
    },
    resume: () => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().resume();
    },
    stop: () => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().stop();
    },
    seek: (position: number) => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().seek(position);
    },
    setPlaybackRate: (rate: number) => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().setPlaybackRate(rate);
    },
    setPlayerMode: (mode: PlayerMode) => {
      if (typeof window === 'undefined') return;
      useTtsStore.getState().setPlayerMode(mode);
    }
  }).current;
  
  // Subscribe to store changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial state update
    setPlayerState({
      isPlaying: useTtsStore.getState().isPlaying,
      isPaused: useTtsStore.getState().isPaused,
      progress: useTtsStore.getState().progress,
      duration: useTtsStore.getState().duration,
      currentPosition: useTtsStore.getState().currentPosition,
      playbackRate: useTtsStore.getState().playbackRate,
      playerMode: useTtsStore.getState().playerMode
    });
    
    // Subscribe to changes
    const unsubscribe = useTtsStore.subscribe(
      (state) => ({
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        progress: state.progress,
        duration: state.duration,
        currentPosition: state.currentPosition,
        playbackRate: state.playbackRate,
        playerMode: state.playerMode
      }),
      (newState) => {
        setPlayerState(newState);
      },
      { equalityFn: shallow }
    );
    
    return unsubscribe;
  }, []);
  
  const toggle = useCallback(() => {
    if (playerState.isPlaying) {
      stableFunctions.pause();
    } else {
      stableFunctions.resume();
    }
  }, [playerState.isPlaying, stableFunctions]);
  
  // Format time values
  const formatTime = useCallback((milliseconds: number): string => {
    if (!milliseconds || isNaN(milliseconds)) return "0:00";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);
  
  // Handle minimize button click
  const handleMinimize = useCallback(() => {
    if (onMinimize) {
      onMinimize();
    } else {
      // Default behavior: switch to mini player
      stableFunctions.setPlayerMode(PlayerMode.MINI);
    }
  }, [onMinimize, stableFunctions]);

  // Add animation when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Display available rates
  const availableRates = [1, 1.25, 1.5, 2];

  return (
    <AnimatePresence>
      {(playerState.isPlaying || playerState.isPaused) ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`transition-all duration-300 ease-in-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}
        >
          <Card className="mb-4 mt-4 shadow-md relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Volume2 className={`h-4 w-4 text-muted-foreground ${playerState.isPlaying ? 'animate-pulse' : ''}`} />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggle} 
                    className="h-8 w-8 hover:bg-primary/10 transition-colors"
                    aria-label={playerState.isPlaying ? "Pause" : "Play"}
                  >
                    {playerState.isPlaying ? 
                      <Pause className="h-4 w-4" /> : 
                      <Play className="h-4 w-4" />
                    }
                  </Button>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <Slider
                    value={[playerState.progress]}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      const seekPosition = (v[0] / 100) * playerState.duration;
                      stableFunctions.seek(seekPosition);
                    }}
                    className="flex-1"
                    aria-label="Progress"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{formatTime(playerState.currentPosition)}</span>
                    <span>{formatTime(playerState.duration)}</span>
                  </div>
                </div>
                
                <div className="flex gap-1 text-sm">
                  {availableRates.map((rate) => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={rate}
                      onClick={() => stableFunctions.setPlaybackRate(rate)}
                      className={`px-2 py-1 rounded transition-colors ${
                        rate === playerState.playbackRate 
                          ? "bg-primary/10 font-bold text-primary" 
                          : "hover:bg-secondary"
                      }`}
                      aria-label={`Set playback rate to ${rate}x`}
                    >
                      {rate}x
                    </motion.button>
                  ))}
                </div>
                
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
                  onClick={stableFunctions.stop} 
                  className="h-8 w-8 hover:bg-red-500/10 transition-colors"
                  aria-label="Stop playback"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            
            {/* Progress indicator overlay */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-primary transition-all" 
              style={{ width: `${playerState.progress}%` }}
              aria-hidden="true"
            />
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}