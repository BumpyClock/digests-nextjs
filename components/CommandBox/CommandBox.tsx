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

interface CommandBoxProps {
  value: string;
  onChange: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
}

export function CommandBox({
  value,
  onChange,
  onApplySearch,
  onSeeAllMatches,
  handleRefresh,
  onFeedSelect,
}: CommandBoxProps) {
  const [open, setOpen] = useState(false);
  const { feedItems, feeds } = useFeedStore();
  const router = useRouter();
  const { setTheme } = useTheme();

  // Get unique feed sources from items if not directly available
  const uniqueFeedSources = useMemo(() => {
    if (feeds && Array.isArray(feeds)) return feeds;

    const sources = new Map();
    feedItems.forEach((item) => {
      if (item.feedTitle && item.feedUrl) {
        sources.set(item.feedUrl, {
          title: item.feedTitle,
          url: item.feedUrl,
        });
      }
    });
    return Array.from(sources.values());
  }, [feedItems, feeds]);

  // Filter feed sources based on search term
  const filteredSources: Feed[] = useMemo(() => {
    if (!value) return uniqueFeedSources;
    const searchLower = value.toLowerCase();
    return uniqueFeedSources.filter(
      (source) =>
        source.title?.toLowerCase().includes(searchLower) ||
        source.siteTitle?.toLowerCase().includes(searchLower)
    );
  }, [uniqueFeedSources, value]);

  // Filter feed items based on search term
  const filteredItems: FeedItem[] = useMemo(() => {
    if (!value) return [];
    const searchLower = value.toLowerCase();
    return feedItems
      .filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower))
      )
      .slice(0, 5); // Show only 5 items
  }, [feedItems, value]);

  // Track total matches before slicing for UI decisions
  const totalMatchCount = useMemo(() => {
    if (!value) return 0;
    const searchLower = value.toLowerCase();
    return feedItems.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.description &&
          item.description.toLowerCase().includes(searchLower))
    ).length;
  }, [feedItems, value]);

  const handleSeeAllMatches = useCallback(() => {
    console.log("See all matches clicked", totalMatchCount);
    onSeeAllMatches(); // Apply the current search value to the main page
    setOpen(false); // Close the command dialog
  }, [onSeeAllMatches, totalMatchCount]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prevOpen) => !prevOpen); // Toggle open state
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Check if we should show the "See All" item
  // Only show if there are more total matches than what we're displaying
  const shouldShowSeeAll = useMemo(() => {
    return value && totalMatchCount > filteredItems.length;
  }, [value, totalMatchCount, filteredItems.length]);

  // Add handler for Enter key in search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onApplySearch(value);
    }
  };

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
            onKeyDown={handleKeyDown}
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
                heading="Feeds"
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredSources.map((source) => (
                  <CommandItem
                    className="text-sm font-normal"
                    key={source.guid || Math.random().toString()}
                    onSelect={() => {
                      onChange("");
                      onFeedSelect(source.feedUrl || "");
                      setOpen(false);
                    }}
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
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* Show Articles section if there are any matches */}
            {value && totalMatchCount > 0 && (
              <CommandGroup
                heading="ARTICLES"
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredItems.map((item) => (
                  <CommandItem
                    className="text-sm font-normal"
                    key={item.id || Math.random().toString()}
                    onSelect={() => {
                      onChange(item.title || "");
                      setOpen(false);
                    }}
                  >
                    
                    <span className="text-xs font-regular">{item.title || "Untitled Article"}</span>
                  </CommandItem>
                ))}
                {/* Separate the See All matches as its own component with clear conditions */}
                {shouldShowSeeAll && (
                  <CommandItem
                    key="see-all-matches"
                    className="text-sm font-normal"
                    onSelect={handleSeeAllMatches}
                  >
                    {<span className="text-xs font-regular">See All {totalMatchCount} Matches</span>}
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
