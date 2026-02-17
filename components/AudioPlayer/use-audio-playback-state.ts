import { useFeedStore } from "@/store/useFeedStore";

export function useAudioPlaybackState() {
  return useFeedStore((state) => ({
    currentAudio: state.currentAudio,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume,
    isMuted: state.isMuted,
    togglePlayPause: state.togglePlayPause,
    seek: state.seek,
    setVolume: state.setVolume,
    toggleMute: state.toggleMute,
    setShowMiniPlayer: state.setShowMiniPlayer,
  }));
}
