"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { FeedItem, Feed } from "@/types";
import { useFeedStore } from "@/store/useFeedStore";
import { Button } from "@/components/ui/button";
import {  Moon, Podcast, RefreshCcw, Rss, Search, Settings, Sun, CheckCircle } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { useCommandBarSearch } from "@/hooks/use-command-bar-search";
import { useCommandBarShortcuts } from "@/hooks/use-command-bar-shortcuts";

/**
 * CommandBarProps interface defines the properties for the CommandBar component.
 * @property {string} value - The current search value.
 * @property {(value: string) => void} onChange - Function to handle changes to the search value.
 * @property {(value: string) => void} onApplySearch - Function to apply the search.
 * @property {() => void} onSeeAllMatches - Function to see all matches.
 * @property {() => void} handleRefresh - Function to refresh the feed.
 * @property {(feedUrl: string) => void} onFeedSelect - Function to handle feed selection.
 */
interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
}

/**
 * CommandBar component for searching and selecting feeds and articles.
 * @param {CommandBarProps} props - The properties for the component.
 * @returns {JSX.Element} The rendered CommandBar component.
 */
export function CommandBar({
  value,
  onChange,
  onApplySearch,
  onSeeAllMatches,
  handleRefresh,
  onFeedSelect,
}: CommandBarProps) {
  const { feedItems, feeds } = useFeedStore();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { open, setOpen, handleKeyDown, handleClose } = useCommandBarShortcuts(onApplySearch);
  
  const {
    filteredSources,
    filteredItems,
    totalMatchCount,
    shouldShowSeeAll,
    handleSeeAllMatches,
    handleFeedSelect: handleFeedSelectSearch,
    handleArticleSelect
  } = useCommandBarSearch(value, feedItems, feeds, onSeeAllMatches, handleClose, onChange);

  const MemoizedCommandItem = React.memo(CommandItem);

  // Debug logs for store data
  console.log('CommandBar Data:', {
    currentValue: value,
    feedItemsCount: feedItems.length,
    feedsCount: feeds?.length,
  });

  // Add the normalizeUrl helper
  const normalizeUrl = (url: string): string => {
    try {
      return decodeURIComponent(url).replace(/\/$/, '');
    } catch {
      return url.replace(/\/$/, '');
    }
  };

  // Update the handleFeedSelect function
  const handleFeedSelect = (feedUrl: string) => {
    console.log('Parent onFeedSelect called with:', feedUrl);
    
    // Normalize the URL
    const normalizedUrl = normalizeUrl(feedUrl);
    console.log('Normalized URL:', normalizedUrl);
    
    // Clear search value BEFORE navigation
    onChange(""); 
    
    // Make sure URL is properly encoded for query params
    const encodedUrl = encodeURIComponent(normalizedUrl);
    console.log('URL for routing:', encodedUrl);
    
    // Update store with normalized URL
    const { setActiveFeed } = useFeedStore.getState();
    setActiveFeed(normalizedUrl);
    
    // Navigate with encoded URL
    router.push(`/web?feed=${encodedUrl}`);
    
    // Close the dialog
    handleClose();
    
    // Log state after setting
    setTimeout(() => {
      const state = useFeedStore.getState();
      const matchingItems = state.feedItems.filter(item => 
        normalizeUrl(item.feedUrl) === normalizedUrl
      );
      
      console.log('Feed items matching this feed:', {
        normalizedUrl,
        matchingItems: matchingItems.map(i => i.title).slice(0, 3),
        count: matchingItems.length
      });
      
      console.log('Store state after feed selection:', {
        activeFeed: state.activeFeed,
        filteredItemsCount: matchingItems.length,
        totalItems: state.feedItems.length,
        searchValue: value
      });
    }, 100);
  };

  // Add debug info for rendering conditions
  console.log('Render Conditions:', {
    showFeeds: filteredSources && filteredSources.length > 0,
    feedsCount: filteredSources?.length,
    showArticles: value && !filteredSources.length && totalMatchCount > 0,
    articlesCount: filteredItems?.length,
    totalMatchCount,
    shouldShowSeeAll
  });

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-lg justify-start text-muted-foreground sm:w-72 px-3 relative "
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="truncate">
          {value || "Search feeds and articles..."}
        </span>
        <kbd className="ml-auto hidden rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg">
          <CommandInput
            placeholder="Type a command or search..."
            value={value}
            onValueChange={onChange}
            onKeyDown={(e) => handleKeyDown(e, value)}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup
              heading="Suggestions"
              className="text-xs"
            >
              <CommandItem>
                <Search  />
                <span className="text-xs font-regular">Search for feeds and articles</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("/web/settings");
                  setOpen(false);
                }}
              >
                <Settings className="mr-2 h-4 w-4 text-xs font-regular" />
               <span className="text-xs font-regular">Settings</span>
              </CommandItem>
              <CommandItem>
                <Podcast className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">Podcasts</span>
              </CommandItem>
              <CommandItem>
                <Rss className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">RSS Feeds</span> 
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  handleRefresh();
                  setOpen(false);
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">Refresh</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("light");
                  setOpen(false);
                }}
              >
                <Sun className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">Light Mode</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("dark");
                  setOpen(false);
                }}
              >
                <Moon className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">Dark Mode</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  const { markAllAsRead } = useFeedStore.getState();
                  markAllAsRead();
                  setOpen(false);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-xs font-regular" />
                <span className="text-xs font-regular">Mark All as Read</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />

            {filteredSources && filteredSources.length > 0 && (
              <CommandGroup
                heading={`Feeds (${filteredSources.length})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredSources.map((source) => (
                  <MemoizedCommandItem
                    className="text-sm font-normal"
                    key={source.guid || Math.random().toString()}
                    onSelect={() => handleFeedSelect(source.feedUrl || "")}
                  >
                    <img 
                      src={source.favicon || ''} 
                      alt={source.feedTitle || "Untitled Feed"} 
                      width={24} 
                      height={24}
                      className="object-cover"
                    />
                    <span className="text-xs font-regular">
                      {source.feedTitle || source.siteTitle || "Unnamed Feed"}
                    </span>
                  </MemoizedCommandItem>
                ))}
              </CommandGroup>
            )}

            {value && !filteredSources.length && totalMatchCount > 0 && (
              <CommandGroup
                heading={`ARTICLES (${filteredItems.length}/${totalMatchCount})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredItems.map((item) => (
                  <MemoizedCommandItem
                    className="text-sm font-normal"
                    key={item.id || Math.random().toString()}
                    onSelect={() => handleArticleSelect(item.title || "")}
                  >
                    <span className="text-xs font-regular">{item.title || "Untitled Article"}</span>
                  </MemoizedCommandItem>
                ))}
                {shouldShowSeeAll && (
                  <MemoizedCommandItem
                    key="see-all-matches"
                    className="text-sm font-normal"
                    onSelect={handleSeeAllMatches}
                  >
                    {<span className="text-xs font-regular">See All {totalMatchCount} Matches</span>}
                  </MemoizedCommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
