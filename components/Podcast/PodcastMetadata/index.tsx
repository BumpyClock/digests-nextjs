"use client";

import { useMemo } from "react";
import { Calendar, Clock, User } from "lucide-react";
import { formatDuration } from "@/utils/formatDuration";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface PodcastMetadataProps {
  published?: string;
  duration?: number;
  author?: string;
  variant?: "default" | "compact";
  className?: string;
  iconSize?: "sm" | "md";
}

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
};

export function PodcastMetadata({
  published,
  duration,
  author,
  variant = "default",
  className,
  iconSize = "md",
}: PodcastMetadataProps) {
  const formattedDate = useMemo(() => {
    if (!published) return null;
    return dayjs(published).fromNow();
  }, [published]);

  const formattedDuration = useMemo(() => {
    if (!duration) return null;
    return formatDuration(duration);
  }, [duration]);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 text-sm text-muted-foreground",
          className,
        )}
      >
        {formattedDate && <span>{formattedDate}</span>}
        {formattedDuration && <span>{formattedDuration}</span>}
        {author && <span>By {author}</span>}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {formattedDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className={iconSizes[iconSize]} />
          <time dateTime={published}>{formattedDate}</time>
        </div>
      )}
      {formattedDuration && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className={iconSizes[iconSize]} />
          <span>{formattedDuration}</span>
        </div>
      )}
      {author && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className={iconSizes[iconSize]} />
          <span>{author}</span>
        </div>
      )}
    </div>
  );
}
