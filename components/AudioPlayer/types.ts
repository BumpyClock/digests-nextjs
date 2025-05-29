/**
 * Interface representing audio information
 */
export interface AudioInfo {
  id: string
  title: string
  source: string
  audioUrl: string
  image?: string
}

/**
 * Context type definition for the audio player
 */
export interface AudioPlayerContextType {
  currentAudio: AudioInfo | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isMuted: boolean
  isMinimized: boolean
  showMiniPlayer: boolean
  playAudio: (audioInfo: AudioInfo) => void
  togglePlayPause: () => void
  seek: (value: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleMinimize: () => void
  setShowMiniPlayer: (show: boolean) => void
} 