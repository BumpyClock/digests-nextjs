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
    const filtered = uniqueFeedSources.filter(
      (source) =>
        source.title?.toLowerCase().includes(searchLower) ||
        source.siteTitle?.toLowerCase().includes(searchLower)
    );
    console.log('Filtered sources:', {
      searchValue,
      totalSources: uniqueFeedSources.length,
      filteredCount: filtered.length,
      firstMatch: filtered[0]
    });
    return filtered;
  }, [uniqueFeedSources, searchValue]);

  const filteredItems = useMemo(() => {
    if (!searchValue) {
      console.log('No search value, returning empty items array');
      return [];
    }
    const searchLower = searchValue.toLowerCase();
    const filtered = feedItems
      .filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      )
      .slice(0, 5);
    
    console.log('Filtered items:', {
      searchValue,
      totalItems: feedItems.length,
      matchedBeforeSlice: feedItems.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      ).length,
      filteredCount: filtered.length,
      firstMatch: filtered[0]
    });
    return filtered;
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

  const shouldShowSeeAll = useMemo(() => {
    return searchValue && totalMatchCount > filteredItems.length;
  }, [searchValue, totalMatchCount, filteredItems.length]);

  const handleSeeAllMatches = useCallback(() => {
    onSeeAllMatches();
    handleClose();
  }, [onSeeAllMatches, handleClose]);

  const handleFeedSelect = useCallback((feedUrl: string) => {
    // Debug the feed URL to see if there are any encoding issues
    debugFeedUrl(feedUrl);
    
    // Clear search when selecting a feed
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
    shouldShowSeeAll,
    handleSeeAllMatches,
    handleFeedSelect,
    handleArticleSelect
  };
}