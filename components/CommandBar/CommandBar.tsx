"use client";

import { useState, useMemo, useCallback } from "react";
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
import { useTheme } from "next-themes";
import { FeedItem, Feed } from "@/types";
import { useFeedStore } from "@/store/useFeedStore";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Podcast,
  RefreshCcw,
  Rss,
  Search,
  Settings,
  Sun,
  CheckCircle,
  Newspaper,
} from "lucide-react";
import React from "react";
import { useCommandBarSearch } from "@/hooks/use-command-bar-search";
import { useCommandBarShortcuts } from "@/hooks/use-command-bar-shortcuts";
import { ReaderViewModal } from "@/components/reader-view-modal";
import Image from 'next/image';

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
}

const MemoizedCommandItem = React.memo(CommandItem, (prevProps, nextProps) => {
  // Custom comparison function to determine if re-render is necessary
  return prevProps.onSelect === nextProps.onSelect && 
         prevProps.children === nextProps.children;
});

export function CommandBar({
  value,
  onChange,
  onApplySearch,
  onSeeAllMatches,
  handleRefresh,
  onFeedSelect,
}: CommandBarProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { feedItems, feeds, markAllAsRead } = useFeedStore();
  const { open, setOpen, handleKeyDown, handleClose } =
    useCommandBarShortcuts(onApplySearch);

  const {
    filteredSources,
    filteredItems,
    handleSeeAllMatches,
    
  } = useCommandBarSearch(
    value,
    feedItems,
    feeds,
    onSeeAllMatches,
    handleClose,
    onChange
  );

  const filteredArticles = useMemo(() => 
    filteredItems.filter(item => item.type === 'article'), 
    [filteredItems]
  );

  const filteredPodcasts = useMemo(() => 
    filteredItems.filter(item => item.type === 'podcast'), 
    [filteredItems]
  );
  console.log('filteredArticles', filteredArticles);
  console.log('filteredPodcasts', filteredPodcasts);

  const handleSelectFeed = useCallback(
    (feedUrl: string) => {
      // Clear the local search
      onChange("");

      // Also call the parent's callback if you have more logic
      onFeedSelect(feedUrl);

      // Then close the CommandBar
      setOpen(false);
    },
    [onChange, onFeedSelect, setOpen]
  );

  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleArticleSelect = useCallback((title: string) => {
    const article = filteredItems.find(item => item.title === title); // Find the selected article
    if (article) {
      setSelectedArticle(article); // Set the selected article
      setModalOpen(true); // Open the modal
    }
  }, [filteredItems]);

  const MAX_DISPLAY_ITEMS = 5; // Define a constant for maximum display items

  const shouldShowSuggestions = (searchValue: string) => {
    const hasMatches = (filteredArticles?.length > 0 || filteredPodcasts?.length > 0);
    
    if (!hasMatches) return true;

    // Only show suggestions if search matches any suggestion keywords
    const suggestionKeywords = ['search', 'settings', 'podcasts', 'rss', 'refresh', 'light', 'dark', 'mark all'];
    return suggestionKeywords.some(keyword => 
      keyword.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-lg justify-start text-muted-foreground sm:w-72 px-3 relative"
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
        <Command className="rounded-lg max-h-[80vh] overflow-y-auto" >
          <CommandInput
            placeholder="Type a command or search..."
            value={value}
            onValueChange={onChange}
            onKeyDown={(e) => handleKeyDown(e, value)}
          />
          <CommandList>
            {!filteredArticles?.length && !filteredPodcasts?.length && !filteredSources?.length && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {/* Show suggestions only when there are no matches or search matches suggestions */}
            {shouldShowSuggestions(value) && (
              <>
                <CommandGroup heading="Suggestions" className="text-xs">
                  <CommandItem>
                    <Search />
                    <span className="text-xs font-regular">
                      Search for feeds/articles
                    </span>
                  </CommandItem>

                  <CommandItem
                    value="settings"
                    onSelect={() => {
                      router.push("/web/settings");
                      setOpen(false);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Settings</span>
                  </CommandItem>

                  <CommandItem
                    value="podcasts"
                    onSelect={() => {
                      router.push("/web/podcasts");
                      setOpen(false);
                    }}
                  >
                    <Podcast className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Podcasts</span>
                  </CommandItem>
                  <CommandItem
                    value="rss"
                    onSelect={() => {
                      router.push("/web/rss");
                      setOpen(false);
                    }}
                  >
                    <Rss className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">RSS Feeds</span>
                  </CommandItem>
                  <CommandItem
                    value="refresh"
                    onSelect={() => {
                      handleRefresh();
                      setOpen(false);
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Refresh</span>
                  </CommandItem>
                  <CommandItem
                    value="light"
                    onSelect={() => {
                      setTheme("light");
                      setOpen(false);
                    }}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Light Mode</span>
                  </CommandItem>
                  <CommandItem
                    value="dark"
                    onSelect={() => {
                      setTheme("dark");
                      setOpen(false);
                    }}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Dark Mode</span>
                  </CommandItem>
                  <CommandItem
                    value="mark all"
                    onSelect={() => {
                      markAllAsRead();
                      setOpen(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span className="text-xs font-regular">Mark All as Read</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* FEEDS LIST */}
            {filteredSources && filteredSources.length > 0 && (
              <CommandGroup
                heading={`Feeds (${filteredSources.length})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredSources.map((source:Feed) => (
                  <MemoizedCommandItem
                    className="text-xs font-normal"
                    value={[source.author, source.categories, source.description, source.feedUrl, source.siteTitle, source.feedTitle].join(" ")}
                    key={source.feedUrl}
                    onSelect={() => handleSelectFeed(source.feedUrl)}
                  >
                    {source.favicon && (
                      <Image
                        src={source.favicon}
                        alt={source.feedTitle || "Untitled Feed"}
                        width={24}
                        height={24}
                        className="object-cover"
                        
                      />
                    )}
                    <span className="text-xs font-regular">
                      {source.feedTitle || source.siteTitle || "Unnamed Feed"}
                    </span>
                  </MemoizedCommandItem>
                ))}
              </CommandGroup>
            )}

            {/* ARTICLES MATCHING */}
            {filteredArticles && filteredArticles.length > 0 && (
              <CommandGroup
                heading={`ARTICLES (${filteredArticles.length})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredArticles.slice(0, MAX_DISPLAY_ITEMS).map((item:FeedItem) => (
                  <MemoizedCommandItem
                    className="text-md font-normal"
                    value=""
                    key={item.id}
                    onSelect={() => {
                      handleArticleSelect(item.title || "");
                    }}
                  >
                    <Newspaper className="mr-2 h-4 w-4" />
                    <span className="text-md font-regular">
                      {item.title || "Untitled Article"}
                    </span>
                  </MemoizedCommandItem>
                ))}
                <CommandItem
                  key="see-all-articles"
                  value=" "
                  className="text-md font-normal"
                  onSelect={handleSeeAllMatches}
                >
                  <span className="text-md font-regular">See All Articles</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* New section for Podcasts */}
            {filteredPodcasts && filteredPodcasts.length > 0 && (
              <CommandGroup
                heading={`PODCASTS (${filteredPodcasts.length})`}
                className="text-md font-bold text-muted-foreground"
              >
                {filteredPodcasts.slice(0, MAX_DISPLAY_ITEMS).map((podcast:FeedItem) => (
                  <MemoizedCommandItem
                    className="text-md font-normal"
                    value=" "
                    key={podcast.id}
                    onSelect={() => {
                      // Handle podcast selection
                    }}
                  >
                    {podcast.favicon && (
                      <Image
                        src={podcast.favicon}
                        alt={podcast.title || "Untitled Feed"}
                        width={24}
                        height={24}
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    <span className="text-md font-regular">
                      {podcast.title || "Untitled Podcast"}
                    </span>
                  </MemoizedCommandItem>
                ))}
                <CommandItem
                  key="see-all-podcasts"
                  className="text-md font-normal"
                  value=""
                  onSelect={() => {
                    // Handle see all podcasts action
                  }}
                >
                  <span className="text-md font-regular">See All Podcasts</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>

      {selectedArticle && (
        <ReaderViewModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          feedItem={selectedArticle}
          initialPosition={{ x: 0, y: 0, width: 600, height: 400 }}
        />
      )}
    </>
  );
}
