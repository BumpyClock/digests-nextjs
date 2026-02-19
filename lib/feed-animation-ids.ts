import { hashString } from "@/utils/hash";

interface FeedAnimationIds {
  cardShell: string;
  thumbnail: string;
  title: string;
  siteMeta: string;
  favicon: string;
  siteName: string;
}

function toSafeId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const hash = hashString(value);
  return slug ? `${slug}-${hash}` : `item-${hash}`;
}

export function getFeedAnimationIds(feedItemId: string): FeedAnimationIds {
  const safeId = toSafeId(feedItemId);

  return {
    cardShell: `feed-card-shell-${safeId}`,
    thumbnail: `feed-thumbnail-${safeId}`,
    title: `feed-title-${safeId}`,
    siteMeta: `feed-site-meta-${safeId}`,
    favicon: `feed-favicon-${safeId}`,
    siteName: `feed-site-name-${safeId}`,
  };
}
