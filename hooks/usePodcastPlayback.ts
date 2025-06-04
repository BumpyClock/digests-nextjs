"use client"

import { useCallback } from "react"
import { useAudioActions, useIsAudioPlaying, useReadActions } from "./useFeedSelectors"
import { getPodcastAudioUrl } from "@/types/podcast"
import type { FeedItem } from "@/types"

interface UsePodcastPlaybackReturn {
  handlePlayPause: () => void
  isCurrentlyPlaying: boolean
}

/**
 * Custom hook for managing podcast playback
 * Handles play/pause, marking as read, and audio URL validation
 */
export function usePodcastPlayback(podcast: FeedItem): UsePodcastPlaybackReturn {
  const { playAudio } = useAudioActions()
  const { markAsRead } = useReadActions()
  const isCurrentlyPlaying = useIsAudioPlaying(podcast.id)

  const handlePlayPause = useCallback(() => {
    // Validate audio URL
    const audioUrl = getPodcastAudioUrl(podcast)
    if (!audioUrl) {
      console.error("No audio URL found for podcast:", podcast.title)
      return
    }

    // Mark as read when playing for the first time
    if (!isCurrentlyPlaying) {
      // Use setTimeout to ensure state updates don't conflict
      setTimeout(() => {
        markAsRead(podcast.id)
      }, 0)
    }

    // Play or pause the audio
    playAudio({
      id: podcast.id,
      title: podcast.title,
      source: podcast.siteTitle,
      audioUrl,
      image: podcast.thumbnail || podcast.favicon,
    })
  }, [podcast, playAudio, markAsRead, isCurrentlyPlaying])

  return {
    handlePlayPause,
    isCurrentlyPlaying,
  }
}