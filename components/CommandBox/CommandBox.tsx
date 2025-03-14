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
import { Moon, RefreshCcw, Search, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface CommandBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
}

export function CommandBox({
  value,
  onChange,
  onSeeAllMatches,
  handleRefresh,
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
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup
              heading="Suggestions"
              className="text-xs font-bold text-muted-foreground"
            >
              <CommandItem>
                <Search className="mr-2 h-4 w-4" />
                Search for feeds and articles
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("/web/settings");
                  setOpen(false);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  handleRefresh();
                  setOpen(false);
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("light");
                  setOpen(false);
                }}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("dark");
                  setOpen(false);
                }}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
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
                      onChange(source.feedTitle || "");
                      setOpen(false);
                    }}
                  >
                    {source.feedTitle || source.siteTitle || "Unnamed Feed"}
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
                    {item.title || "Untitled Article"}
                  </CommandItem>
                ))}
                {/* Separate the See All matches as its own component with clear conditions */}
                {shouldShowSeeAll && (
                  <CommandItem
                    key="see-all-matches"
                    className="text-sm font-normal"
                    onSelect={handleSeeAllMatches}
                  >
                    {`See All ${totalMatchCount} Matches`}
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
