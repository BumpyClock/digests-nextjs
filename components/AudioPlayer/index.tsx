"use client";

import { useFeedStore } from "@/store/useFeedStore";
import { AudioMiniPlayer } from "./AudioMiniPlayer";

/**
 * Main audio player component that conditionally renders the mini player
 */
export function AudioPlayer() {
  const showMiniPlayer = useFeedStore((state) => state.showMiniPlayer);
  const isMinimized = useFeedStore((state) => state.isMinimized);

  // Only show mini player when it's enabled and minimized
  if (!showMiniPlayer || !isMinimized) {
    return null;
  }

  return <AudioMiniPlayer />;
}
