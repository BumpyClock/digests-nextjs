"use client";

import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { AudioMiniPlayer } from "./AudioMiniPlayer";

/**
 * Main audio player component that conditionally renders the mini player
 * Now uses React hooks instead of Zustand for state management
 */
export function AudioPlayer() {
  const { showMiniPlayer, isMinimized } = useAudioPlayer();

  // Only show mini player when it's enabled and minimized
  if (!showMiniPlayer || !isMinimized) {
    return null;
  }

  return <AudioMiniPlayer />;
}

// Export components for external use
export { AudioMiniPlayer } from "./AudioMiniPlayer";
export { AudioControls } from "./AudioControls";
export type { AudioInfo } from "./types";
