/**
 * TTS Player Mode State Machine
 * 
 * This hook implements a state machine for managing transitions between
 * different TTS player modes (inline, mini, disabled).
 */
import { useCallback, useEffect } from 'react';
import { 
  useUnifiedAudioStore, 
  PlayerMode,
  useAudioPlayback,
  useAudioContent,
  useAudioUI
} from '@/store/useUnifiedAudioStore';
import TtsAudioAdapter from '@/components/tts-audio-adapter';

// Define all possible transition events
export type TtsPlayerModeTransition = 
  | 'PLAY_INLINE'
  | 'PLAY_MINI'
  | 'MINIMIZE'
  | 'MAXIMIZE'
  | 'TOGGLE'
  | 'STOP';

// Define the state machine graph
const MODE_TRANSITIONS: Record<PlayerMode, Record<TtsPlayerModeTransition, PlayerMode | null>> = {
  [PlayerMode.DISABLED]: {
    PLAY_INLINE: PlayerMode.INLINE,
    PLAY_MINI: PlayerMode.MINI,
    MINIMIZE: null, // Invalid transition
    MAXIMIZE: null, // Invalid transition
    TOGGLE: null,   // Invalid transition
    STOP: PlayerMode.DISABLED
  },
  [PlayerMode.INLINE]: {
    PLAY_INLINE: PlayerMode.INLINE, // No-op
    PLAY_MINI: PlayerMode.MINI,
    MINIMIZE: PlayerMode.MINI,
    MAXIMIZE: PlayerMode.INLINE, // No-op
    TOGGLE: PlayerMode.MINI,
    STOP: PlayerMode.DISABLED
  },
  [PlayerMode.MINI]: {
    PLAY_INLINE: PlayerMode.INLINE,
    PLAY_MINI: PlayerMode.MINI, // No-op
    MINIMIZE: PlayerMode.MINI, // No-op
    MAXIMIZE: PlayerMode.INLINE,
    TOGGLE: PlayerMode.INLINE,
    STOP: PlayerMode.DISABLED
  }
};

/**
 * Custom hook for managing TTS player mode transitions
 */
export function useTtsPlayerModeTransitions() {
  // Check if we're on the server side
  if (typeof window === "undefined") {
    // Return stub functions for SSR
    return {
      playerMode: PlayerMode.DISABLED,
      isPlaying: false,
      isPaused: false,
      currentText: '',
      currentArticle: null,
      transition: () => {},
      canTransition: () => false,
      playInline: () => {},
      playMini: () => {},
      toggleMode: () => {},
      minimize: () => {},
      maximize: () => {},
      stopPlayer: () => {}
    };
  }
  
  const { playerMode, setPlayerMode } = useAudioUI();
  const { isPlaying, isPaused, stop, pause, resume } = useAudioPlayback();
  const { currentContent, loadContent } = useAudioContent();
  const currentText = currentContent?.text || '';
  const currentArticle = currentContent;
  
  // Track previous mode for toggling - but ensure we access the store safely
  let previousMode = PlayerMode.INLINE;
  try {
    previousMode = useUnifiedAudioStore.getState().playerMode === PlayerMode.DISABLED 
      ? PlayerMode.INLINE 
      : useUnifiedAudioStore.getState().playerMode;
  } catch (e) {
    // Ignore errors during SSR
  }
  
  /**
   * Transition the player mode according to the state machine
   */
  const transition = useCallback((transitionEvent: TtsPlayerModeTransition) => {
    const nextMode = MODE_TRANSITIONS[playerMode][transitionEvent];
    
    // If transition is not valid, do nothing
    if (nextMode === null) {
      console.warn(`Invalid transition: ${playerMode} -> ${transitionEvent}`);
      return;
    }
    
    // Handle special cases that need additional logic
    switch (transitionEvent) {
      case 'PLAY_INLINE':
        if (!currentText) {
          console.warn('Cannot play - no text content');
          return;
        }
        
        setPlayerMode(PlayerMode.INLINE);
        
        if (isPaused) {
          resume();
        } else if (!isPlaying && currentText) {
          // Only start playing if not already playing
          loadContent({
            ...currentArticle,
            textContent: currentText,
            autoplay: true
          });
        }
        break;
        
      case 'PLAY_MINI':
        if (!currentText) {
          console.warn('Cannot play - no text content');
          return;
        }
        
        setPlayerMode(PlayerMode.MINI);
        
        if (isPaused) {
          resume();
        } else if (!isPlaying && currentText) {
          // Only start playing if not already playing
          loadContent({
            ...currentArticle,
            textContent: currentText,
            autoplay: true
          });
        }
        break;
        
      case 'MINIMIZE':
        // Create mini player adapter if needed
        setPlayerMode(PlayerMode.MINI);
        break;
        
      case 'MAXIMIZE':
        setPlayerMode(PlayerMode.INLINE);
        break;
        
      case 'TOGGLE':
        const newMode = playerMode === PlayerMode.INLINE 
          ? PlayerMode.MINI
          : PlayerMode.INLINE;
        setPlayerMode(newMode);
        break;
        
      case 'STOP':
        stop();
        setPlayerMode(PlayerMode.DISABLED);
        break;
    }
  }, [
    playerMode, 
    setPlayerMode, 
    isPlaying, 
    isPaused, 
    loadContent, 
    stop, 
    resume, 
    currentText, 
    currentArticle
  ]);
  
  /**
   * Play in a specific mode (or toggle if already in that mode)
   */
  const playInMode = useCallback((mode: PlayerMode.INLINE | PlayerMode.MINI, text?: string, metadata?: any) => {
    const transitionEvent = mode === PlayerMode.INLINE ? 'PLAY_INLINE' : 'PLAY_MINI';
    
    // If we're already in the target mode and playing, toggle pause
    if (playerMode === mode && (isPlaying || isPaused)) {
      isPlaying ? pause() : resume();
      return;
    }
    
    transition(transitionEvent);
  }, [playerMode, isPlaying, isPaused, pause, resume, transition]);
  
  /**
   * Convenience methods for common transitions
   */
  const playInline = useCallback((text?: string, metadata?: any) => {
    playInMode(PlayerMode.INLINE, text, metadata);
  }, [playInMode]);
  
  const playMini = useCallback((text?: string, metadata?: any) => {
    playInMode(PlayerMode.MINI, text, metadata);
  }, [playInMode]);
  
  const toggleMode = useCallback(() => {
    transition('TOGGLE');
  }, [transition]);
  
  const minimize = useCallback(() => {
    transition('MINIMIZE');
  }, [transition]);
  
  const maximize = useCallback(() => {
    transition('MAXIMIZE');
  }, [transition]);
  
  const stopPlayer = useCallback(() => {
    transition('STOP');
  }, [transition]);
  
  // Check if a transition is valid from the current state
  const canTransition = useCallback((transitionEvent: TtsPlayerModeTransition): boolean => {
    return MODE_TRANSITIONS[playerMode][transitionEvent] !== null;
  }, [playerMode]);
  
  return {
    playerMode,
    isPlaying,
    isPaused,
    currentText,
    currentArticle,
    
    // State machine methods
    transition,
    canTransition,
    
    // Convenience methods
    playInline,
    playMini,
    toggleMode,
    minimize,
    maximize,
    stopPlayer
  };
}

export default useTtsPlayerModeTransitions;