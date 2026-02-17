import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaybackButtonsProps {
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  buttonClassName?: string;
  playButtonClassName?: string;
  iconClassName?: string;
  prevSlot?: React.ReactNode;
  nextSlot?: React.ReactNode;
}

export function PlaybackButtons({
  isPlaying,
  onTogglePlayPause,
  buttonClassName = "h-8 w-8",
  playButtonClassName,
  iconClassName = "h-5 w-5",
  prevSlot,
  nextSlot,
}: PlaybackButtonsProps) {
  return (
    <>
      {prevSlot}
      <Button variant="ghost" size="icon" className={buttonClassName}>
        <SkipBack className={iconClassName} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={playButtonClassName ?? buttonClassName}
        onClick={onTogglePlayPause}
      >
        {isPlaying ? <Pause className={iconClassName} /> : <Play className={iconClassName} />}
      </Button>
      <Button variant="ghost" size="icon" className={buttonClassName}>
        <SkipForward className={iconClassName} />
      </Button>
      {nextSlot}
    </>
  );
}
