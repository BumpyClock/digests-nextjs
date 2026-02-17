import { Copy, Podcast, Rss, Trash2 } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import noise from "@/public/noise.svg";
import type { Feed } from "@/types";
import type { Subscription } from "@/types/subscription";
import { getSiteDisplayName } from "@/utils/htmlUtils";

interface FeedCardProps {
  feed: Feed | Subscription;
  onDelete?: () => void;
  onCopy?: () => void;
}

function sanitizeId(value: string) {
  const normalized = value.trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${slug || "feed"}-${hash.toString(36)}`;
}

export const SettingsFeedCard = memo(function SettingsFeedCard({
  feed,
  onDelete,
  onCopy,
}: FeedCardProps) {
  const feedCardId = `settings-feed-card-${sanitizeId(feed.feedUrl)}`;

  const handleDelete = () => {
    onDelete?.();
  };

  const handleCopy = () => {
    onCopy?.();
  };

  const isPodcastFeed = (candidate: Feed | Subscription): candidate is Feed =>
    "type" in candidate && candidate.type === "podcast";
  const PlaceholderIcon = isPodcastFeed(feed) ? Podcast : Rss;
  const hasFavicon = Boolean(feed.favicon);

  return (
    <div className="group relative transition-token-transform duration-token-normal ease-token-standard group-hover:-translate-y-2 group-hover:scale-105">
      <div id={feedCardId} className="relative z-[2] flex h-full flex-col p-5">
        <div className="flex-1">
          <div className="mb-4 transition-token-transform duration-token-slow ease-token-standard group-hover:-translate-y-1">
            {hasFavicon ? (
              <Image
                src={feed.favicon as string}
                alt={`${getSiteDisplayName(feed)} icon`}
                width={48}
                height={48}
                className="rounded-sm transition-token-transform duration-token-normal ease-token-standard group-hover:scale-110"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-muted text-secondary-content transition-token-transform duration-token-normal ease-token-standard group-hover:scale-110">
                <PlaceholderIcon size={28} aria-hidden="true" />
              </div>
            )}
          </div>
          <h3 className="mb-1 line-clamp-2 text-subtitle text-primary-content">
            {getSiteDisplayName(feed)}
          </h3>
          {feed.feedTitle && (
            <p className="mb-2 text-caption text-secondary-content">{feed.feedTitle}</p>
          )}
          <p className="break-all text-body-small text-secondary-content opacity-0 transition-token-opacity duration-token-fast group-hover:opacity-100">
            {feed.feedUrl}
          </p>
        </div>
        <div className="mt-6 flex border-t border-border pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md p-2 text-secondary-content transition-token-colors duration-token-fast hover:bg-muted hover:text-primary-content"
            aria-label="Delete feed"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md p-2 text-secondary-content transition-token-colors duration-token-fast hover:bg-muted hover:text-primary-content"
            aria-label="Copy feed URL"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl absolute top-0 left-0 w-full h-full z-[-1]">
        <div
          id={`${feedCardId}-noise`}
          className="overflow-hidden absolute top-0 left-0 w-full h-full opacity-5 bg-cover bg-center"
          style={{ backgroundImage: `url(${noise.src})` }}
        />
        {hasFavicon && (
          <div
            id={`${feedCardId}-imageblur`}
            className="absolute left-0 top-0 h-full w-full overflow-hidden bg-cover bg-center opacity-15 brightness-80 transition-token-filter duration-token-normal group-hover:opacity-30 group-hover:blur-[100px] group-hover:brightness-120"
            style={{ backgroundImage: `url(${feed.favicon})` }}
          />
        )}
      </div>
      <div className="absolute left-0 top-0 h-full w-full rounded-xl border border-border bg-card shadow-md transition-token-shadow duration-token-normal group-hover:shadow-xl" />
    </div>
  );
});
