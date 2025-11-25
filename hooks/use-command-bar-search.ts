import { useMemo, useCallback } from 'react';
import { FeedItem, Feed } from '@/types';
import type { Subscription } from '@/types/subscription';
import { useDebounce } from 'use-debounce';

/**
 * Helper: combine relevant FeedItem fields & see if they match `query`.
 */
function itemMatchesSearch(item: FeedItem, query: string): { match: boolean; score: number } {
  const search = query.toLowerCase();

  // Combine relevant fields into one string
  const combined = [
    item.title,
    item.author,
    item.description,
    item.content,
    item.categories,
  ]
    .filter(Boolean) // remove null/undefined
    .join(" "); // combine with a space

  const fullMatch = combined.toLowerCase().includes(` ${search} `) || combined.toLowerCase().startsWith(search) || combined.toLowerCase().endsWith(search);
  const partialMatch = combined.toLowerCase().includes(search);

  return {
    match: fullMatch || partialMatch,
    score: fullMatch ? 2 : (partialMatch ? 1 : 0) // Full match gets higher score
  };
}

/**
 * Helper: combine relevant Feed fields & see if they match `query`.
 */
function feedMatchesSearch(feed: Feed | Subscription, query: string): { match: boolean; score: number } {
  const search = query.toLowerCase();

  // Combine relevant feed fields (including siteName for API response compatibility)
  const combined = [
    feed.feedTitle,
    feed.siteName,
    feed.siteTitle,
    (feed as Feed).description,
    (feed as Feed).categories,
    (feed as Feed).author,
  ]
    .filter(Boolean)
    .join(" ");

  const fullMatch = combined.toLowerCase().includes(` ${search} `) || combined.toLowerCase().startsWith(search) || combined.toLowerCase().endsWith(search);
  const partialMatch = combined.toLowerCase().includes(search);

  return {
    match: fullMatch || partialMatch,
    score: fullMatch ? 2 : (partialMatch ? 1 : 0) // Full match gets higher score
  };
}


export function useCommandBarSearch(
  searchValue: string,
  feedItems: FeedItem[],
  feeds: Array<Feed | Subscription>,
  onSeeAllMatches: () => void,
  handleClose: () => void,
  onSearchValueChange: (value: string) => void
) {

  const debouncedValue = useDebounce(searchValue, 300);

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
    if (!searchValue) {
      return uniqueFeedSources;
    }
    const searchLower = searchValue.toLowerCase();
    const filtered = (uniqueFeedSources as Array<Feed | Subscription>)
      .map(feed => ({ feed, ...feedMatchesSearch(feed, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score); 

    return filtered.map(({ feed }) => feed); // Return only feeds
  }, [uniqueFeedSources, searchValue]);

  const filteredItems = useMemo(() => {
    if (!searchValue) {
      return [];
    }
    const searchLower = searchValue.toLowerCase();
    const filtered = feedItems
      .map(item => ({ item, ...itemMatchesSearch(item, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score);
    
    const filteredItems = filtered.map(({ item }) => item); 
    return filteredItems; 
  }, [feedItems, searchValue]);

  const totalMatchCount = useMemo(() => {
    if (!searchValue) return 0;
    const searchLower = searchValue.toLowerCase();
    return feedItems.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.description &&
          item.description.toLowerCase().includes(searchLower))
    ).length;
  }, [feedItems, searchValue]);



  const handleSeeAllMatches = useCallback(() => {
    onSeeAllMatches();
    handleClose();
  }, [onSeeAllMatches, handleClose]);

  const handleFeedSelect = useCallback((feedUrl: string) => {
    
    onSearchValueChange(""); 
    
    
    handleClose();
    return feedUrl;
  }, [onSearchValueChange, handleClose]);

  const handleArticleSelect = useCallback((title: string) => {
    onSearchValueChange(title);
    handleClose();
  }, [onSearchValueChange, handleClose]);

  return {
    debouncedValue,
    filteredSources,
    filteredItems,
    totalMatchCount,
    handleSeeAllMatches,
    handleFeedSelect,
    handleArticleSelect
  };
}
