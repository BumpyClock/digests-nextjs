"use client";

import { Columns, LayoutGrid, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CommandBar } from "@/components/CommandBar/CommandBar";
import { EmptyState } from "@/components/EmptyState";
import { FEED_REFRESHED_EVENT, FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid";
import { FeedMasterDetail } from "@/components/Feed/FeedMasterDetail/FeedMasterDetail";
import { RefreshButton } from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// React Query imports
import { useFeedBackgroundSync, useFeedsData, useRefreshFeedsMutation } from "@/hooks/queries";
import { useWebPageData } from "@/hooks/useFeedSelectors";
import { useHydratedStore } from "@/store/useFeedStore";
import type { FeedItem } from "@/types";
import { Logger } from "@/utils/logger";
import { normalizeUrl } from "@/utils/url";
import { WebSettingsTabs } from "./settings/components/web-settings-tabs";

const useHydration = () => useHydratedStore(() => true, false);

function getFeedFilterFromLocation() {
  if (typeof window === "undefined") return "";

  const feedParam = new URLSearchParams(window.location.search).get("feed");
  return feedParam ? normalizeUrl(feedParam) : "";
}

function WebPageContent() {
  const isHydrated = useHydration();
  const [searchState, setSearchState] = useState(() => ({
    query: "",
    appliedQuery: "",
    feedUrlDecoded: getFeedFilterFromLocation(),
  }));
  const [layoutState, setLayoutState] = useState<{
    selectedTab: string;
    viewMode: "grid" | "masterDetail";
  }>({
    selectedTab: "unread",
    viewMode: "grid",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const refreshedRef = useRef(false);
  const [stableUnreadItems, setStableUnreadItems] = useState<FeedItem[]>([]);

  const router = useRouter();
  const searchQuery = searchState.query;
  const appliedSearchQuery = searchState.appliedQuery;
  const feedUrlDecoded = searchState.feedUrlDecoded;
  const selectedTab = layoutState.selectedTab;
  const viewMode = layoutState.viewMode;
  const isMasterDetailMode = viewMode === "masterDetail";
  const masterDetailContainerClass = isMasterDetailMode ? "h-dvh" : "";
  const masterDetailTabsClass = isMasterDetailMode ? "h-full min-h-0" : "";

  const feedsQuery = useFeedsData();
  const refreshMutation = useRefreshFeedsMutation();
  const { data: backgroundSyncData, clearNotification } = useFeedBackgroundSync();

  const { initialized, setInitialized, setActiveFeed } = useWebPageData();

  const emptyReadItems = useMemo(() => new Set<string>(), []);
  const emptyReadLater = useMemo(() => new Set<string>(), []);

  const readItems = useHydratedStore((state) => state.readItems, emptyReadItems);
  const readLaterSet = useHydratedStore((state) => state.readLaterItems, emptyReadLater);

  const feedItems = useMemo(() => feedsQuery.data?.items ?? [], [feedsQuery.data?.items]);
  const loading = feedsQuery.isLoading;
  const refreshing = refreshMutation.isPending;
  const isLoading = loading || refreshing;

  useEffect(() => {
    if (isHydrated && !initialized) {
      setInitialized(true);
    }
  }, [isHydrated, initialized, setInitialized]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally snapshot readItems only when feedItems change
  useEffect(() => {
    if (feedItems.length > 0) {
      const unreadAtRefresh = feedItems.filter((item) => !readItems.has(item.id));
      setStableUnreadItems(unreadAtRefresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedItems]); // Only depend on feedItems, not readItems - intentional for stable content

  useEffect(() => {
    if (isHydrated && initialized && !refreshedRef.current) {
      refreshedRef.current = true;
    }
  }, [isHydrated, initialized]);

  const handleRefresh = useCallback(() => {
    Logger.debug("Refreshing feeds with React Query...");
    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        refreshedRef.current = true;
        clearNotification();
        window.dispatchEvent(new CustomEvent(FEED_REFRESHED_EVENT));
        toast.success("Feeds refreshed successfully");
      },
      onError: (error) => {
        console.error("Failed to refresh feeds:", error);
        toast.error("Failed to refresh feeds");
      },
    });
  }, [refreshMutation, clearNotification]);

  useEffect(() => {
    if (backgroundSyncData?.hasNewItems) {
      toast("New items available", {
        description: `${backgroundSyncData.count} new item${backgroundSyncData.count === 1 ? "" : "s"} available`,
        action: {
          label: "Refresh",
          onClick: handleRefresh,
        },
        duration: 10000, // 10 seconds
      });
    }
  }, [backgroundSyncData, handleRefresh]);

  useEffect(() => {
    const handleFeedRefresh = () => {
      refreshedRef.current = true;
    };

    window.addEventListener(FEED_REFRESHED_EVENT, handleFeedRefresh);
    return () => {
      window.removeEventListener(FEED_REFRESHED_EVENT, handleFeedRefresh);
    };
  }, []);

  useEffect(() => {
    const updateFeedFilterFromLocation = () => {
      const nextFeedUrlDecoded = getFeedFilterFromLocation();
      setSearchState((prev) =>
        prev.feedUrlDecoded === nextFeedUrlDecoded
          ? prev
          : { ...prev, feedUrlDecoded: nextFeedUrlDecoded }
      );
    };

    window.addEventListener("popstate", updateFeedFilterFromLocation);
    return () => {
      window.removeEventListener("popstate", updateFeedFilterFromLocation);
    };
  }, []);

  const handleFeedSelect = useCallback(
    (feedUrl: string) => {
      const normalizedUrl = normalizeUrl(feedUrl);
      setActiveFeed(normalizedUrl);
      setSearchState({ query: "", appliedQuery: "", feedUrlDecoded: normalizedUrl });
      const newUrl = `/web?feed=${encodeURIComponent(normalizedUrl)}`;
      router.push(newUrl);
    },
    [router, setActiveFeed]
  );

  const handleSearch = useCallback((value: string) => {
    setSearchState((prev) => ({ ...prev, query: value }));
  }, []);

  const handleApplySearch = useCallback((value: string) => {
    setSearchState((prev) => ({ ...prev, appliedQuery: value }));
  }, []);

  const handleSeeAllMatches = useCallback(() => {
    setSearchState((prev) => ({ ...prev, appliedQuery: prev.query }));
  }, []);

  const toggleViewMode = useCallback(() => {
    setLayoutState((prev) => ({
      ...prev,
      viewMode: prev.viewMode === "grid" ? "masterDetail" : "grid",
    }));
  }, []);

  const searchLower = useMemo(
    () => (appliedSearchQuery ? appliedSearchQuery.toLowerCase() : ""),
    [appliedSearchQuery]
  );

  const filterKey = `${feedUrlDecoded}::${searchLower}`;

  const categorized = useMemo(() => {
    const all: FeedItem[] = [];
    const articles: FeedItem[] = [];
    const podcasts: FeedItem[] = [];
    const readLater: FeedItem[] = [];
    let unreadCount = 0;
    let unreadPodcastCount = 0;
    let unreadArticleCount = 0;
    let unreadReadLaterCount = 0;

    for (const item of feedItems) {
      if (!item?.id) continue;
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) continue;
      if (
        searchLower &&
        !item.title?.toLowerCase().includes(searchLower) &&
        !item.description?.toLowerCase().includes(searchLower)
      )
        continue;

      all.push(item);
      const isArticle = item.type === "article";
      const isPodcast = item.type === "podcast";
      if (isArticle) articles.push(item);
      else if (isPodcast) podcasts.push(item);

      const isRead = readItems.has(item.id);
      if (readLaterSet.has(item.id)) {
        readLater.push(item);
        if (!isRead) unreadReadLaterCount++;
      }
      if (!isRead) {
        unreadCount++;
        if (isPodcast) unreadPodcastCount++;
        if (isArticle) unreadArticleCount++;
      }
    }
    return {
      all,
      articles,
      podcasts,
      readLater,
      unreadCount,
      unreadPodcastCount,
      unreadArticleCount,
      unreadReadLaterCount,
    };
  }, [feedItems, feedUrlDecoded, searchLower, readItems, readLaterSet]);

  const filteredUnreadItems = useMemo(() => {
    if (!stableUnreadItems.length) return [];
    return stableUnreadItems.filter((item) => {
      if (!item?.id) return false;
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) return false;
      if (searchLower) {
        return (
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [stableUnreadItems, feedUrlDecoded, searchLower]);

  const clearFeedFilter = useCallback(() => {
    setSearchState((prev) =>
      prev.feedUrlDecoded ? { ...prev, feedUrlDecoded: "" } : prev
    );
    router.push("/web");
  }, [router]);

  const handleTabChange = useCallback((value: string) => {
    setLayoutState((prev) => ({ ...prev, selectedTab: value }));
  }, []);

  return (
    <div
      className={["w-full px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3", masterDetailContainerClass]
        .filter(Boolean)
        .join(" ")}
    >
      <FeedTabsSection
        masterDetailTabsClass={masterDetailTabsClass}
        selectedTab={selectedTab}
        onTabChange={handleTabChange}
        feedUrlDecoded={feedUrlDecoded}
        clearFeedFilter={clearFeedFilter}
        categorized={categorized}
        filteredUnreadItems={filteredUnreadItems}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onApplySearch={handleApplySearch}
        onSeeAllMatches={handleSeeAllMatches}
        onRefresh={handleRefresh}
        onFeedSelect={handleFeedSelect}
        feedItems={feedItems}
        onOpenSettings={() => setSettingsOpen(true)}
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
        refreshing={refreshing}
        isLoading={isLoading}
        filterKey={filterKey}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

/** A small wrapper for your FeedGrid or empty state logic. */
function FeedTabContent({
  items,
  isLoading,
  viewMode,
  filterKey,
}: {
  items: FeedItem[];
  isLoading: boolean;
  viewMode: "grid" | "masterDetail";
  filterKey: string;
}) {
  if (isLoading) {
    return <FeedGrid items={[]} isLoading />;
  }
  if (!items || items.length === 0) {
    return <EmptyState />;
  }

  return viewMode === "grid" ? (
    <FeedGrid items={items} isLoading={false} filterKey={filterKey} />
  ) : (
    <FeedMasterDetail items={items} isLoading={false} />
  );
}

interface FeedTabsSectionProps {
  masterDetailTabsClass: string;
  selectedTab: string;
  onTabChange: (value: string) => void;
  feedUrlDecoded: string;
  clearFeedFilter: () => void;
  categorized: {
    all: FeedItem[];
    articles: FeedItem[];
    podcasts: FeedItem[];
    readLater: FeedItem[];
    unreadPodcastCount: number;
    unreadArticleCount: number;
    unreadReadLaterCount: number;
  };
  filteredUnreadItems: FeedItem[];
  searchQuery: string;
  onSearch: (value: string) => void;
  onApplySearch: (value: string) => void;
  onSeeAllMatches: () => void;
  onRefresh: () => void;
  onFeedSelect: (feedUrl: string) => void;
  feedItems: FeedItem[];
  onOpenSettings: () => void;
  viewMode: "grid" | "masterDetail";
  toggleViewMode: () => void;
  refreshing: boolean;
  isLoading: boolean;
  filterKey: string;
}

function FeedTabsSection({
  masterDetailTabsClass,
  selectedTab,
  onTabChange,
  feedUrlDecoded,
  clearFeedFilter,
  categorized,
  filteredUnreadItems,
  searchQuery,
  onSearch,
  onApplySearch,
  onSeeAllMatches,
  onRefresh,
  onFeedSelect,
  feedItems,
  onOpenSettings,
  viewMode,
  toggleViewMode,
  refreshing,
  isLoading,
  filterKey,
}: FeedTabsSectionProps) {
  const tabsContentClassName = ["mt-0", viewMode === "masterDetail" && "flex-1 min-h-0"]
    .filter(Boolean)
    .join(" ");

  return (
    <Tabs
      defaultValue="unread"
      className={["flex flex-col gap-3 sm:gap-4", masterDetailTabsClass].filter(Boolean).join(" ")}
      value={selectedTab}
      onValueChange={onTabChange}
    >
      <div className="flex shrink-0 flex-col gap-3 rounded-lg border bg-card/40 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {feedUrlDecoded && (
            <button
              type="button"
              onClick={clearFeedFilter}
              className="flex items-center gap-2 text-body-small text-secondary-content transition-token-colors duration-token-fast hover:text-primary-content"
            >
              <span>×</span> Clear Feed Filter
            </button>
          )}
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="all">
              All
              {categorized.all.length > 0 && ` (${categorized.all.length})`}
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              Unread
              {filteredUnreadItems.length > 0 && ` (${filteredUnreadItems.length})`}
            </TabsTrigger>
            <TabsTrigger value="articles">
              Articles
              {categorized.unreadArticleCount > 0 && ` (${categorized.unreadArticleCount})`}
            </TabsTrigger>
            <TabsTrigger value="podcasts">
              Podcasts
              {categorized.unreadPodcastCount > 0 && ` (${categorized.unreadPodcastCount})`}
            </TabsTrigger>
            <TabsTrigger value="readLater">
              Read Later
              {categorized.unreadReadLaterCount > 0 && ` (${categorized.unreadReadLaterCount})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CommandBar
            value={searchQuery}
            onChange={onSearch}
            onApplySearch={onApplySearch}
            onSeeAllMatches={onSeeAllMatches}
            handleRefresh={onRefresh}
            onFeedSelect={onFeedSelect}
            items={feedItems}
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleViewMode}
            className="shrink-0"
            aria-label={viewMode === "grid" ? "Switch to Master-Detail view" : "Switch to Grid view"}
            title={viewMode === "grid" ? "Switch to Master-Detail view" : "Switch to Grid view"}
          >
            {viewMode === "grid" ? <Columns className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <RefreshButton onClick={onRefresh} isLoading={refreshing} />
        </div>
      </div>

      <TabsContent value="all" className={tabsContentClassName}>
        <FeedTabContent
          items={categorized.all}
          isLoading={isLoading}
          viewMode={viewMode}
          filterKey={filterKey}
        />
      </TabsContent>

      <TabsContent value="unread" className={tabsContentClassName}>
        <FeedTabContent
          items={filteredUnreadItems}
          isLoading={isLoading}
          viewMode={viewMode}
          filterKey={filterKey}
        />
      </TabsContent>

      <TabsContent value="articles" className={tabsContentClassName}>
        <FeedTabContent
          items={categorized.articles}
          isLoading={isLoading}
          viewMode={viewMode}
          filterKey={filterKey}
        />
      </TabsContent>

      <TabsContent value="podcasts" className={tabsContentClassName}>
        <FeedTabContent
          items={categorized.podcasts}
          isLoading={isLoading}
          viewMode={viewMode}
          filterKey={filterKey}
        />
      </TabsContent>

      <TabsContent value="readLater" className={tabsContentClassName}>
        <FeedTabContent
          items={categorized.readLater}
          isLoading={isLoading}
          viewMode={viewMode}
          filterKey={filterKey}
        />
      </TabsContent>
    </Tabs>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="h-[92dvh] w-[96vw] max-w-6xl gap-0 overflow-hidden border bg-background p-0 data-[state=open]:duration-200 data-[state=closed]:duration-150 data-[state=open]:ease-out data-[state=closed]:ease-out motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-secondary-content" />
              <p className="text-label text-primary-content">Settings</p>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close settings dialog"
                title="Close settings dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <WebSettingsTabs />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Make the main page component simpler
export default function AppPage() {
  return (
    <Suspense fallback={<FeedGrid items={[]} isLoading />}>
      <WebPageContent />
    </Suspense>
  );
}
