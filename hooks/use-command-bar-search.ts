import { useMemo, useCallback } from "react";
import { FeedItem, Feed } from "@/types";
import type { Subscription } from "@/types/subscription";
import { useDebounce } from "use-debounce";

/**
 * Helper: combine relevant FeedItem fields & see if they match `query`.
 */
function itemMatchesSearch(item: FeedItem, query: string): { match: boolean; score: number } {
  const search = query.toLowerCase();

  // Early-exit on short fields first to avoid expensive content join
  const shortFields = [item.title, item.author, item.description, item.categories]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const shortFull =
    shortFields.includes(` ${search} `) ||
    shortFields.startsWith(search) ||
    shortFields.endsWith(search);
  if (shortFull) return { match: true, score: 2 };

  if (shortFields.includes(search)) return { match: true, score: 1 };

  // Fall back to content only if short fields didn't match
  if (item.content) {
    const contentLower = item.content.toLowerCase();
    const contentFull =
      contentLower.includes(` ${search} `) ||
      contentLower.startsWith(search) ||
      contentLower.endsWith(search);
    if (contentFull) return { match: true, score: 2 };
    if (contentLower.includes(search)) return { match: true, score: 1 };
  }

  return { match: false, score: 0 };
}

/**
 * Helper: combine relevant Feed fields & see if they match `query`.
 */
function feedMatchesSearch(
  feed: Feed | Subscription,
  query: string
): { match: boolean; score: number } {
  const search = query.toLowerCase();

  const combined = [
    feed.feedTitle,
    feed.siteName,
    feed.siteTitle,
    (feed as Feed).description,
    (feed as Feed).categories,
    (feed as Feed).author,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const fullMatch =
    combined.includes(` ${search} `) ||
    combined.startsWith(search) ||
    combined.endsWith(search);

  if (fullMatch) return { match: true, score: 2 };
  if (combined.includes(search)) return { match: true, score: 1 };
  return { match: false, score: 0 };
}

export function useCommandBarSearch(
  searchValue: string,
  feedItems: FeedItem[],
  feeds: Array<Feed | Subscription>,
  onSeeAllMatches: () => void,
  handleClose: () => void,
  onSearchValueChange: (value: string) => void
) {
  const [debouncedValue] = useDebounce(searchValue, 300);

  const uniqueFeedSources = useMemo(() => {
    if (feeds && Array.isArray(feeds)) {
      return feeds;
    }

    const sources = new Map();
    feedItems.forEach((item) => {
      if (item.feedTitle && item.feedUrl) {
        sources.set(item.feedUrl, {
          title: item.feedTitle,
          url: item.feedUrl,
        });
      }
    });
    const sourcesArray = Array.from(sources.values());
    return sourcesArray;
  }, [feedItems, feeds]);

  const filteredSources = useMemo(() => {
    if (!debouncedValue) {
      return uniqueFeedSources;
    }
    const searchLower = debouncedValue.toLowerCase();
    const filtered = (uniqueFeedSources as Array<Feed | Subscription>)
      .map((feed) => ({ feed, ...feedMatchesSearch(feed, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score);

    return filtered.map(({ feed }) => feed); // Return only feeds
  }, [uniqueFeedSources, debouncedValue]);

  const filteredItems = useMemo(() => {
    if (!debouncedValue) {
      return [];
    }
    const searchLower = debouncedValue.toLowerCase();
    const filtered = feedItems
      .map((item) => ({ item, ...itemMatchesSearch(item, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score);

    const filteredItems = filtered.map(({ item }) => item);
    return filteredItems;
  }, [feedItems, debouncedValue]);

  const totalMatchCount = filteredItems.length;

  const handleSeeAllMatches = useCallback(() => {
    onSeeAllMatches();
    handleClose();
  }, [onSeeAllMatches, handleClose]);

  const handleFeedSelect = useCallback(
    (feedUrl: string) => {
      onSearchValueChange("");

      handleClose();
      return feedUrl;
    },
    [onSearchValueChange, handleClose]
  );

  const handleArticleSelect = useCallback(
    (title: string) => {
      onSearchValueChange(title);
      handleClose();
    },
    [onSearchValueChange, handleClose]
  );

  return {
    debouncedValue,
    filteredSources,
    filteredItems,
    totalMatchCount,
    handleSeeAllMatches,
    handleFeedSelect,
    handleArticleSelect,
  };
}
