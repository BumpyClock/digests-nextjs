"use client"

import { AudioPlayer } from "./AudioPlayer"
import { AudioMiniPlayer } from "./AudioMiniPlayer"
import { AudioControls } from "./AudioControls"
import type { AudioInfo } from "./types"

/**
 * Main component that renders the audio player UI
 */
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AudioPlayer />
    </>
  )
}

export { AudioMiniPlayer }
export { AudioControls }
export type { AudioInfo } 