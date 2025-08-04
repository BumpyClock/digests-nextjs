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
import { useReadActions } from "@/hooks/useFeedActions";
import { useFeeds } from "@/hooks/queries/use-feeds";
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
import Image from "next/image";

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
}

const MemoizedCommandItem = React.memo(CommandItem, (prevProps, nextProps) => {
  return (
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.children === nextProps.children
  );
});
MemoizedCommandItem.displayName = "MemoizedCommandItem";

// Constants
const MAX_DISPLAY_ITEMS = 5;

// Suggestion components
const SuggestionItem = React.memo(
  ({
    icon: Icon,
    label,
    onSelect,
  }: {
    icon: React.ElementType;
    label: string;
    onSelect: () => void;
  }) => (
    <CommandItem value={label.toLowerCase()} onSelect={onSelect}>
      <Icon className="mr-2 h-4 w-4" />
      <span className="text-xs font-regular">{label}</span>
    </CommandItem>
  ),
);
SuggestionItem.displayName = "SuggestionItem";

// Feed Item Component
const FeedItemComponent = React.memo(
  ({
    source,
    onSelect,
  }: {
    source: Feed;
    onSelect: (feedUrl: string) => void;
  }) => (
    <MemoizedCommandItem
      className="text-xs font-normal"
      value={[
        source.author,
        source.categories,
        source.description,
        source.feedUrl,
        source.siteTitle,
        source.feedTitle,
      ].join(" ")}
      key={source.feedUrl}
      onSelect={() => onSelect(source.feedUrl)}
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
  ),
);
FeedItemComponent.displayName = "FeedItemComponent";

// Article Item Component
const ArticleItemComponent = React.memo(
  ({
    item,
    onSelect,
  }: {
    item: FeedItem;
    onSelect: (title: string) => void;
  }) => (
    <MemoizedCommandItem
      className="text-md font-normal"
      value=""
      key={item.id}
      onSelect={() => onSelect(item.title || "")}
    >
      <Newspaper className="mr-2 h-4 w-4" />
      <span className="text-md font-regular">
        {item.title || "Untitled Article"}
      </span>
    </MemoizedCommandItem>
  ),
);
ArticleItemComponent.displayName = "ArticleItemComponent";

// Podcast Item Component
const PodcastItemComponent = React.memo(
  ({ podcast }: { podcast: FeedItem }) => (
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
  ),
);
PodcastItemComponent.displayName = "PodcastItemComponent";

// Suggestions Section Component
const SuggestionsSection = React.memo(
  ({
    setOpen,
    router,
    setTheme,
    handleRefresh,
    markAllAsRead,
  }: {
    setOpen: (open: boolean) => void;
    router: ReturnType<typeof useRouter>;
    setTheme: (theme: string) => void;
    handleRefresh: () => void;
    markAllAsRead: () => void;
  }) => (
    <CommandGroup heading="Suggestions" className="text-xs">
      <SuggestionItem
        icon={Search}
        label="Search for feeds/articles"
        onSelect={() => {}}
      />
      <SuggestionItem
        icon={Settings}
        label="Settings"
        onSelect={() => {
          router.push("/web/settings");
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={Podcast}
        label="Podcasts"
        onSelect={() => {
          router.push("/web/podcasts");
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={Rss}
        label="RSS Feeds"
        onSelect={() => {
          router.push("/web/rss");
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={RefreshCcw}
        label="Refresh"
        onSelect={() => {
          handleRefresh();
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={Sun}
        label="Light Mode"
        onSelect={() => {
          setTheme("light");
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={Moon}
        label="Dark Mode"
        onSelect={() => {
          setTheme("dark");
          setOpen(false);
        }}
      />
      <SuggestionItem
        icon={CheckCircle}
        label="Mark All as Read"
        onSelect={() => {
          markAllAsRead();
          setOpen(false);
        }}
      />
    </CommandGroup>
  ),
);
SuggestionsSection.displayName = "SuggestionsSection";

// Search trigger button component
const SearchTriggerButton = React.memo(
  ({ value, setOpen }: { value: string; setOpen: (open: boolean) => void }) => (
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
  ),
);
SearchTriggerButton.displayName = "SearchTriggerButton";

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
  const { feeds } = useFeeds();
  const { markAllAsRead } = useReadActions();
  // const unreadCount = useUnreadCount();
  const { feedItems } = useFeedStore(); // Still need feedItems for search
  const { open, setOpen, handleKeyDown, handleClose } =
    useCommandBarShortcuts(onApplySearch);

  const { filteredSources, filteredItems, handleSeeAllMatches } =
    useCommandBarSearch(
      value,
      feedItems,
      feeds,
      onSeeAllMatches,
      handleClose,
      onChange,
    );

  const filteredArticles = useMemo(
    () => filteredItems.filter((item) => item.type === "article"),
    [filteredItems],
  );

  const filteredPodcasts = useMemo(
    () => filteredItems.filter((item) => item.type === "podcast"),
    [filteredItems],
  );

  const handleSelectFeed = useCallback(
    (feedUrl: string) => {
      onChange("");
      onFeedSelect(feedUrl);
      setOpen(false);
    },
    [onChange, onFeedSelect, setOpen],
  );

  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleArticleSelect = useCallback(
    (title: string) => {
      const article = filteredItems.find((item) => item.title === title);
      if (article) {
        setSelectedArticle(article);
        setModalOpen(true);
      }
    },
    [filteredItems],
  );

  const shouldShowSuggestions = useCallback(
    (searchValue: string) => {
      const hasMatches =
        filteredArticles?.length > 0 || filteredPodcasts?.length > 0;
      if (!hasMatches) return true;
      const suggestionKeywords = [
        "search",
        "settings",
        "podcasts",
        "rss",
        "refresh",
        "light",
        "dark",
        "mark all",
      ];
      return suggestionKeywords.some((keyword) =>
        keyword.toLowerCase().includes(searchValue.toLowerCase()),
      );
    },
    [filteredArticles, filteredPodcasts],
  );

  return (
    <>
      <SearchTriggerButton value={value} setOpen={setOpen} />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg max-h-[80vh] overflow-y-auto">
          <CommandInput
            placeholder="Type a command or search..."
            value={value}
            onValueChange={onChange}
            onKeyDown={(e) => handleKeyDown(e, value)}
          />
          <CommandList>
            {!filteredArticles?.length &&
              !filteredPodcasts?.length &&
              !filteredSources?.length && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

            {shouldShowSuggestions(value) && (
              <>
                <SuggestionsSection
                  setOpen={setOpen}
                  router={router}
                  setTheme={setTheme}
                  handleRefresh={handleRefresh}
                  markAllAsRead={markAllAsRead}
                />
                <CommandSeparator />
              </>
            )}

            {filteredSources && filteredSources.length > 0 && (
              <CommandGroup
                heading={`Feeds (${filteredSources.length})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredSources.map((source: Feed) => (
                  <FeedItemComponent
                    key={source.feedUrl}
                    source={source}
                    onSelect={handleSelectFeed}
                  />
                ))}
              </CommandGroup>
            )}

            {filteredArticles && filteredArticles.length > 0 && (
              <CommandGroup
                heading={`ARTICLES (${filteredArticles.length})`}
                className="text-xs font-bold text-muted-foreground"
              >
                {filteredArticles
                  .slice(0, MAX_DISPLAY_ITEMS)
                  .map((item: FeedItem) => (
                    <ArticleItemComponent
                      key={item.id}
                      item={item}
                      onSelect={handleArticleSelect}
                    />
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

            {filteredPodcasts && filteredPodcasts.length > 0 && (
              <CommandGroup
                heading={`PODCASTS (${filteredPodcasts.length})`}
                className="text-md font-bold text-muted-foreground"
              >
                {filteredPodcasts
                  .slice(0, MAX_DISPLAY_ITEMS)
                  .map((podcast: FeedItem) => (
                    <PodcastItemComponent key={podcast.id} podcast={podcast} />
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
        />
      )}
    </>
  );
}
