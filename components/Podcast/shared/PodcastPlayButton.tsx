"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import {
  useAudioActions,
  useReadActions,
  useIsAudioPlaying,
} from "@/hooks/useFeedActions";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/types";
import { getPodcastAudioUrl } from "@/types/podcast";

interface PodcastPlayButtonProps {
  podcast: FeedItem;
  variant?:
    | "default"
    | "ghost"
    | "outline"
    | "secondary"
    | "destructive"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  onPlayStart?: () => void;
}

export const PodcastPlayButton = memo(function PodcastPlayButton({
  podcast,
  variant = "default",
  size = "default",
  className,
  showLabel = false,
  onPlayStart,
}: PodcastPlayButtonProps) {
  const { playAudio } = useAudioActions();
  const { markAsRead } = useReadActions();
  const isCurrentlyPlaying = useIsAudioPlaying(podcast.id);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Validate podcast has audio
      const audioUrl = getPodcastAudioUrl(podcast);
      if (!audioUrl) {
        console.error("No audio URL found for podcast:", podcast.title);
        return;
      }

      // Mark as read when playing
      if (!isCurrentlyPlaying) {
        setTimeout(() => {
          markAsRead(podcast.id);
        }, 0);
        onPlayStart?.();
      }

      // Play/pause audio
      playAudio({
        id: podcast.id,
        title: podcast.title,
        source: podcast.siteTitle,
        audioUrl,
        image: podcast.thumbnail || podcast.favicon,
      });
    },
    [podcast, playAudio, markAsRead, isCurrentlyPlaying, onPlayStart],
  );

  const label = isCurrentlyPlaying ? "Pause" : "Play";
  const Icon = isCurrentlyPlaying ? Pause : Play;

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      aria-label={`${label} ${podcast.title}`}
      aria-pressed={isCurrentlyPlaying}
    >
      <Icon
        className={cn(
          size === "icon" ? "h-4 w-4" : "h-5 w-5",
          !showLabel && size !== "icon" && "mr-0",
        )}
      />
      {showLabel && <span>{label}</span>}
    </Button>
  );
});
