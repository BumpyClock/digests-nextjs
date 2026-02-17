"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { FeedItem } from "@/types";
import { cleanupTextContent, getSiteDisplayName } from "@/utils/htmlUtils";
import { isValidUrl } from "@/utils/url";

dayjs.extend(relativeTime);

interface FeedItemPreviewMetaProps {
  item: FeedItem;
  className?: string;
  faviconSize?: number;
  showDate?: boolean;
  dateLabel?: string;
}

export function FeedItemPreviewMeta({
  item,
  className,
  faviconSize = 16,
  showDate = true,
  dateLabel,
}: FeedItemPreviewMetaProps) {
  const [faviconError, setFaviconError] = useState(false);

  const siteName = useMemo(() => cleanupTextContent(getSiteDisplayName(item)), [item]);
  const resolvedDateLabel = useMemo(() => {
    if (dateLabel) {
      return dateLabel;
    }
    return item.published ? dayjs(item.published).fromNow() : "Date unknown";
  }, [item.published, dateLabel]);

  const initial = siteName.charAt(0).toUpperCase();

  return (
    <div className={className}>
      <div className="flex items-center gap-2 min-w-0">
        {!faviconError && item.favicon && isValidUrl(item.favicon) ? (
          <Image
            src={item.favicon}
            alt={`${siteName} favicon`}
            width={faviconSize}
            height={faviconSize}
            className="rounded-sm bg-background"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <div
            className="rounded-sm bg-muted flex items-center justify-center text-caption"
            style={{ width: faviconSize, height: faviconSize }}
          >
            {initial}
          </div>
        )}
        <span className="truncate text-caption text-secondary-content">{siteName}</span>
      </div>
      {showDate && <span className="text-caption text-secondary-content">{resolvedDateLabel}</span>}
    </div>
  );
}
