export interface FeedAnimationIds {
  thumbnail: string;
  title: string;
  siteMeta: string;
  favicon: string;
  siteName: string;
}

function hashString(value: string): string {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
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
    thumbnail: `feed-thumbnail-${safeId}`,
    title: `feed-title-${safeId}`,
    siteMeta: `feed-site-meta-${safeId}`,
    favicon: `feed-favicon-${safeId}`,
    siteName: `feed-site-name-${safeId}`,
  };
}
