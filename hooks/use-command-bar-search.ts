import { useMemo, useCallback } from 'react';
import { FeedItem, Feed } from '@/types';
import { useDebounce } from 'use-debounce';

const debugFeedUrl = (url: string) => {
  console.log('Feed URL Details:', {
    original: url,
    encoded: encodeURIComponent(url),
    decoded: decodeURIComponent(url),
    length: url.length,
    containsSpecialChars: /[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]/.test(url)
  });
  return url;
};

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
function feedMatchesSearch(feed: Feed, query: string): { match: boolean; score: number } {
  const search = query.toLowerCase();

  // Combine relevant feed fields
  const combined = [
    feed.feedTitle,
    feed.siteTitle,
    feed.description,
    feed.categories,
    feed.author, // if your Feed object has feed.author
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
  feeds: Feed[],
  onSeeAllMatches: () => void,
  handleClose: () => void,
  onSearchValueChange: (value: string) => void
) {
  // Debug logs for input data
  console.log('Search Hook Input:', {
    searchValue,
    feedItemsCount: feedItems.length,
    feedsCount: feeds?.length,
  });

  const debouncedValue = useDebounce(searchValue, 300);

  const uniqueFeedSources = useMemo(() => {
    if (feeds && Array.isArray(feeds)) {
      console.log('Using provided feeds:', feeds.length);
      return feeds;
    }

    console.log('Building sources from feedItems');
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
    console.log('Built sources:', sourcesArray.length);
    return sourcesArray;
  }, [feedItems, feeds]);

  const filteredSources = useMemo(() => {
    if (!searchValue) {
      console.log('No search value, returning all sources:', uniqueFeedSources.length);
      return uniqueFeedSources;
    }
    const searchLower = searchValue.toLowerCase();
    const filtered = feeds
      .map(feed => ({ feed, ...feedMatchesSearch(feed, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score); 

    console.log('Filtered sources:', {
      searchValue,
      totalSources: uniqueFeedSources.length,
      filteredCount: filtered.length,
      firstMatch: filtered[0]?.feed
    });
    return filtered.map(({ feed }) => feed); // Return only feeds
  }, [uniqueFeedSources, searchValue]);

  const filteredItems = useMemo(() => {
    if (!searchValue) {
      console.log('No search value, returning empty items array');
      return [];
    }
    const searchLower = searchValue.toLowerCase();
    const filtered = feedItems
      .map(item => ({ item, ...itemMatchesSearch(item, searchLower) }))
      .filter(({ match }) => match)
      .sort((a, b) => b.score - a.score);
    
    console.log('[useCommandBarSearch] [filteredItems] [filtered]', {
      searchValue,
      totalItems: feedItems.length,
      filteredCount: filtered.length,
      firstMatch: filtered[0]?.item,
      filtered: filtered
    });
    const filteredItems = filtered.map(({ item }) => item); 
    console.log('[useCommandBarSearch] [filteredItems] [filteredItems]', filteredItems);
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
    // debugFeedUrl(feedUrl);
    
    onSearchValueChange(""); 
    
    console.log('Feed selection in hook - clearing search value');
    
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