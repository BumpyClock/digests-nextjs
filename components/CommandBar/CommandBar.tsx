// ABOUTME: Command bar component providing global search and quick actions.
// ABOUTME: Implements feed/article filtering, suggestions, and reader modal launching.
"use client";

import {
  CheckCircle,
  Moon,
  Newspaper,
  Podcast,
  RefreshCcw,
  Rss,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import React, { useCallback, useMemo, useState } from "react";
import { ReaderViewModal } from "@/components/reader-view-modal";
import { Button } from "@/components/ui/button";
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
import { useCommandBarSearch } from "@/hooks/use-command-bar-search";
import { useCommandBarShortcuts } from "@/hooks/use-command-bar-shortcuts";
import { useReadActions, useSubscriptions } from "@/hooks/useFeedSelectors";
import { Feed, FeedItem } from "@/types";
import type { Subscription } from "@/types/subscription";
import { getSiteDisplayName } from "@/utils/htmlUtils";

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  handleRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
  items?: FeedItem[]; // Optional prop to accept React Query data
}

// Constants
const MAX_DISPLAY_ITEMS = 5;

// Suggestion components
const SuggestionItem = ({
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
    <span className="text-caption">{label}</span>
  </CommandItem>
);

// Feed Item Component
const FeedItemComponent = ({
  source,
  onSelect,
}: { source: Feed | Subscription; onSelect: (feedUrl: string) => void }) => (
  <CommandItem
    className="text-caption"
    value={[
      (source as Feed).author,
      (source as Feed).categories,
      (source as Feed).description,
      source.feedUrl,
      source.siteName,
      source.siteTitle,
      source.feedTitle,
    ]
      .filter(Boolean)
      .join(" ")}
    onSelect={() => onSelect(source.feedUrl)}
  >
    {source.favicon && (
      <Image
        src={source.favicon}
        alt={getSiteDisplayName(source) || "Untitled Feed"}
        width={24}
        height={24}
        className="object-cover"
      />
    )}
    <span className="text-caption">{getSiteDisplayName(source) || source.feedTitle || "Unnamed Feed"}</span>
  </CommandItem>
);

// Article Item Component
const ArticleItemComponent = ({
  item,
  onSelect,
}: { item: FeedItem; onSelect: (itemId: string) => void }) => (
  <CommandItem
    className="text-body"
    value={`article:${item.id} ${item.title ?? ""}`.trim()}
    onSelect={() => onSelect(item.id)}
  >
    <Newspaper className="mr-2 h-4 w-4" />
    <span className="text-body">{item.title || "Untitled Article"}</span>
  </CommandItem>
);

// Podcast Item Component
const PodcastItemComponent = ({
  podcast,
  onSelect,
}: { podcast: FeedItem; onSelect: (podcastId: string) => void }) => (
  <CommandItem
    className="text-body"
    value={`podcast:${podcast.id} ${podcast.title ?? ""}`.trim()}
    onSelect={() => onSelect(podcast.id)}
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
    <span className="text-body">{podcast.title || "Untitled Podcast"}</span>
  </CommandItem>
);

// Suggestions Section Component
const SuggestionsSection = ({
  setOpen,
  router,
  setTheme,
  handleRefresh,
  markAllAsRead,
  feedItems,
}: {
  setOpen: (open: boolean) => void;
  router: ReturnType<typeof useRouter>;
  setTheme: (theme: string) => void;
  handleRefresh: () => void;
  markAllAsRead: (items: FeedItem[]) => void;
  feedItems: FeedItem[];
}) => (
  <CommandGroup heading="Suggestions" className="text-caption">
    <SuggestionItem icon={Search} label="Search for feeds/articles" onSelect={() => {}} />
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
        markAllAsRead(feedItems);
        setOpen(false);
      }}
    />
  </CommandGroup>
);

// Search trigger button component
const SearchTriggerButton = ({ value, setOpen }: { value: string; setOpen: (open: boolean) => void }) => (
  <Button
    variant="outline"
    className="w-full max-w-lg justify-start text-secondary-content sm:w-72 px-3 relative"
    onClick={() => setOpen(true)}
  >
    <Search className="mr-2 h-4 w-4" />
    <span className="truncate">{value || "Search feeds and articles..."}</span>
    <kbd className="ml-auto hidden rounded bg-muted px-1.5 text-caption text-secondary-content sm:inline-flex">
      ⌘K
    </kbd>
  </Button>
);

export function CommandBar({
  value,
  onChange,
  onApplySearch,
  onSeeAllMatches,
  handleRefresh,
  onFeedSelect,
  items,
}: CommandBarProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const feeds = useSubscriptions();
  const { markAllAsRead } = useReadActions();
  // const unreadCount = useUnreadCount();
  // Prefer prop (React Query data). Do not read items from store.
  const feedItems: FeedItem[] = items ?? [];
  const { open, setOpen, handleKeyDown, handleClose } = useCommandBarShortcuts(onApplySearch);

  const { filteredSources, filteredItems, handleSeeAllMatches } = useCommandBarSearch(
    value,
    feedItems,
    feeds,
    onSeeAllMatches,
    handleClose,
    onChange
  );

  const { filteredArticles, filteredPodcasts, articlesById } = useMemo(() => {
    const articles: FeedItem[] = [];
    const podcasts: FeedItem[] = [];
    const byId = new Map<string, FeedItem>();
    for (const item of filteredItems) {
      if (item.type === "article") {
        articles.push(item);
        byId.set(item.id, item);
      } else if (item.type === "podcast") {
        podcasts.push(item);
      }
    }
    return { filteredArticles: articles, filteredPodcasts: podcasts, articlesById: byId };
  }, [filteredItems]);

  const handleSelectFeed = useCallback(
    (feedUrl: string) => {
      onChange("");
      onFeedSelect(feedUrl);
      setOpen(false);
    },
    [onChange, onFeedSelect, setOpen]
  );

  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleArticleSelect = useCallback(
    (itemId: string) => {
      const article = articlesById.get(itemId);
      if (article) {
        setSelectedArticle(article);
        setModalOpen(true);
      }
    },
    [articlesById]
  );

  const handlePodcastSelect = useCallback(
    (podcastId: string) => {
      router.push(`/web/podcast/${podcastId}`);
      setOpen(false);
    },
    [router, setOpen]
  );

  const shouldShowSuggestions = useCallback(
    (searchValue: string) => {
      const hasMatches = filteredArticles?.length > 0 || filteredPodcasts?.length > 0;
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
        keyword.toLowerCase().includes(searchValue.toLowerCase())
      );
    },
    [filteredArticles, filteredPodcasts]
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
            {!filteredArticles?.length && !filteredPodcasts?.length && !filteredSources?.length && (
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
                  feedItems={feedItems}
                />
                <CommandSeparator />
              </>
            )}

            {filteredSources && filteredSources.length > 0 && (
              <CommandGroup
                heading={`Feeds (${filteredSources.length})`}
                className="text-overline text-secondary-content"
              >
                {filteredSources.map((source: Feed | Subscription) => (
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
                className="text-overline text-secondary-content"
              >
                {filteredArticles.slice(0, MAX_DISPLAY_ITEMS).map((item: FeedItem) => (
                  <ArticleItemComponent key={item.id} item={item} onSelect={handleArticleSelect} />
                ))}
                <CommandItem
                  key="see-all-articles"
                  value="action:see-all-articles"
                  className="text-body"
                  onSelect={handleSeeAllMatches}
                >
                  <span className="text-body">See All Articles</span>
                </CommandItem>
              </CommandGroup>
            )}

            {filteredPodcasts && filteredPodcasts.length > 0 && (
              <CommandGroup
                heading={`PODCASTS (${filteredPodcasts.length})`}
                className="text-overline text-secondary-content"
              >
                {filteredPodcasts.slice(0, MAX_DISPLAY_ITEMS).map((podcast: FeedItem) => (
                  <PodcastItemComponent
                    key={podcast.id}
                    podcast={podcast}
                    onSelect={handlePodcastSelect}
                  />
                ))}
                <CommandItem
                  key="see-all-podcasts"
                  className="text-body"
                  value="action:see-all-podcasts"
                  onSelect={() => {
                    // Handle see all podcasts action
                  }}
                >
                  <span className="text-body">See All Podcasts</span>
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
