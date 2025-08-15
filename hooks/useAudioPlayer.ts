/**
 * Audio player hook using React state (replacing Zustand)
 *
 * This hook manages audio playback state using React's built-in state management
 * instead of Zustand. This provides better React integration and eliminates
 * the need for external state management for audio functionality.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { AudioInfo } from "@/components/AudioPlayer/types";
import { handleAudioError } from "@/utils/audio";

interface AudioPlayerState {
  currentAudio: AudioInfo | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isMinimized: boolean;
  showMiniPlayer: boolean;
}

const initialState: AudioPlayerState = {
  currentAudio: null,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: 1,
  isMuted: false,
  isMinimized: false,
  showMiniPlayer: false,
};

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>(initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();

      const audio = audioRef.current;

      audio.onloadedmetadata = () => {
        setState((prev) => ({ ...prev, duration: audio.duration }));
      };

      audio.ontimeupdate = () => {
        setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
      };

      audio.onended = () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback(
    (audioInfo: AudioInfo) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Validate audio URL
      if (!audioInfo.audioUrl) {
        handleAudioError(new Error("No audio URL provided"), audioInfo.title);
        return;
      }

      if (state.currentAudio && state.currentAudio.id === audioInfo.id) {
        // Toggle play/pause for the same audio
        const newIsPlaying = !state.isPlaying;
        setState((prev) => ({ ...prev, isPlaying: newIsPlaying }));

        if (newIsPlaying) {
          audio.play().catch((error) => {
            handleAudioError(error, audioInfo.title);
            setState((prev) => ({ ...prev, isPlaying: false }));
          });
        } else {
          audio.pause();
        }
        return;
      }

      // Play new audio
      setState((prev) => ({
        ...prev,
        currentAudio: audioInfo,
        isPlaying: true,
        showMiniPlayer: true,
        isMinimized: true,
      }));

      audio.src = audioInfo.audioUrl;
      audio.volume = state.isMuted ? 0 : state.volume;
      audio.play().catch((error) => {
        handleAudioError(error, audioInfo.title);
        setState((prev) => ({ ...prev, isPlaying: false }));
      });
    },
    [state.currentAudio, state.isPlaying, state.isMuted, state.volume],
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newIsPlaying = !state.isPlaying;

    // If resuming playback, ensure mini player is shown
    if (newIsPlaying && !state.showMiniPlayer) {
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        showMiniPlayer: true,
        isMinimized: true,
      }));
    } else {
      setState((prev) => ({ ...prev, isPlaying: newIsPlaying }));
    }

    if (newIsPlaying) {
      audio.play().catch((error) => {
        handleAudioError(error, state.currentAudio?.title);
        setState((prev) => ({ ...prev, isPlaying: false }));
      });
    } else {
      audio.pause();
    }
  }, [state.isPlaying, state.showMiniPlayer, state.currentAudio]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value;
      setState((prev) => ({ ...prev, currentTime: value }));
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    setState((prev) => ({ ...prev, volume: value, isMuted: value === 0 }));
    const audio = audioRef.current;
    if (audio) {
      audio.volume = value;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newIsMuted = !state.isMuted;
    setState((prev) => ({ ...prev, isMuted: newIsMuted }));

    const audio = audioRef.current;
    if (audio) {
      audio.volume = newIsMuted ? 0 : state.volume;
    }
  }, [state.isMuted, state.volume]);

  const toggleMinimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const setShowMiniPlayer = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showMiniPlayer: show }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    playAudio,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    toggleMinimize,
    setShowMiniPlayer,
  };
}
