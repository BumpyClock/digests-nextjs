"use client";

import { Columns, LayoutGrid, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CommandBar } from "@/components/CommandBar/CommandBar";
import { EmptyStateAllCaughtUp, EmptyStateNoFeeds } from "@/components/EmptyState";
import { FEED_REFRESHED_EVENT, FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid";
import { FeedMasterDetail } from "@/components/Feed/FeedMasterDetail/FeedMasterDetail";
import { RefreshButton } from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// React Query imports
import { useFeedBackgroundSync, useFeedsData, useRefreshFeedsMutation } from "@/hooks/queries";
import { useSubscriptions, useWebPageData } from "@/hooks/useFeedSelectors";
import { useHydratedStore } from "@/store/useFeedStore";
import type { FeedItem } from "@/types";
import { Logger } from "@/utils/logger";
import { normalizeUrl } from "@/utils/url";
import { WebSettingsTabs } from "./settings/components/web-settings-tabs";
import { SettingsShell } from "./settings/components/settings-shell";

const useHydration = () => useHydratedStore(() => true, false);
type FeedTabKey = "all" | "unread" | "articles" | "podcasts" | "readLater";
type FeedTabConfig = {
  value: FeedTabKey;
  label: string;
  count: number;
  items: FeedItem[];
  triggerClassName?: string;
};

/**
 * Renders the main feed reader interface with tabbed navigation, search, filtering, and view mode toggling.
 *
 * Displays feed items organized into tabs for all items, unread, articles, podcasts, and read-later lists. Supports filtering by feed, searching, refreshing feeds, and switching between grid and master-detail views. Maintains UI state in sync with URL parameters and feed store hydration.
 */
function WebPageContent() {
  const isHydrated = useHydration();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<FeedTabKey>("unread");
  const [viewMode, setViewMode] = useState<"grid" | "masterDetail">("grid");
  const isMasterDetailMode = viewMode === "masterDetail";
  const masterDetailContainerClass = isMasterDetailMode ? "h-dvh" : "";
  const masterDetailTabsClass = isMasterDetailMode ? "h-full min-h-0" : "";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const refreshedRef = useRef(false);
  const [stableUnreadItems, setStableUnreadItems] = useState<FeedItem[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Grab ?feed=...
  const feedParam = searchParams.get("feed");
  // Normalize/trim the feed URL
  const feedUrlDecoded = feedParam ? normalizeUrl(feedParam) : "";

  // React Query hooks for server state
  const feedsQuery = useFeedsData();
  const refreshMutation = useRefreshFeedsMutation();
  const { data: backgroundSyncData, clearNotification } = useFeedBackgroundSync();

  // Zustand hooks for client state only
  const { initialized, setInitialized, setActiveFeed } = useWebPageData();
  const subscriptions = useSubscriptions();
  const hasSubscriptions = subscriptions.length > 0;

  const emptyReadItems = useMemo(() => new Set<string>(), []);
  const emptyReadLater = useMemo(() => new Set<string>(), []);

  // Get read items set for unread filtering
  const readItems = useHydratedStore((state) => state.readItems, emptyReadItems);
  const readLaterSet = useHydratedStore((state) => state.readLaterItems, emptyReadLater);

  // React Query is now the single source of truth for server state
  const feedItems = useMemo(() => feedsQuery.data?.items ?? [], [feedsQuery.data?.items]);
  const loading = feedsQuery.isLoading;
  const refreshing = refreshMutation.isPending;
  const isLoading = loading || refreshing;

  /**
   * Simple initialization - React Query handles all data fetching
   */
  useEffect(() => {
    if (isHydrated && !initialized) {
      setInitialized(true);
    }
  }, [isHydrated, initialized, setInitialized]);

  /**
   * Update stable unread items only when feedItems change (on refresh)
   * This keeps unread page content stable even when items are marked as read
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally snapshot readItems only when feedItems change
  useEffect(() => {
    if (feedItems.length > 0) {
      // Use read items state at the time of refresh, not current reactive state
      const unreadAtRefresh = feedItems.filter((item) => !readItems.has(item.id));
      setStableUnreadItems(unreadAtRefresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedItems]); // Only depend on feedItems, not readItems - intentional for stable content

  /**
   * Mark as initialized once unread items are calculated
   */
  useEffect(() => {
    if (isHydrated && initialized && !refreshedRef.current) {
      refreshedRef.current = true;
    }
  }, [isHydrated, initialized]);

  /**
   *  Handler to refresh feeds using React Query
   */
  const handleRefresh = useCallback(() => {
    Logger.debug("Refreshing feeds with React Query...");
    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        // Stable unread items will be recalculated by the useEffect when React Query data updates
        refreshedRef.current = true;

        // Clear new items notification immediately
        clearNotification();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent(FEED_REFRESHED_EVENT));

        toast.success("Feeds refreshed successfully");
      },
      onError: (error) => {
        console.error("Failed to refresh feeds:", error);
        toast.error("Failed to refresh feeds");
      },
    });
  }, [refreshMutation, clearNotification]);

  /**
   * Handle background sync notifications
   */
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

  /**
   * Listen for feed refresh events from FeedGrid
   */
  useEffect(() => {
    const handleFeedRefresh = () => {
      // Stable unread items will be automatically recalculated when React Query data changes
      refreshedRef.current = true;
    };

    window.addEventListener(FEED_REFRESHED_EVENT, handleFeedRefresh);
    return () => {
      window.removeEventListener(FEED_REFRESHED_EVENT, handleFeedRefresh);
    };
  }, []);

  /**
   * Called from CommandBar when user picks a feed from the list.
   * This navigates to /web?feed=<encoded> so that the param is consistent.
   */
  const handleFeedSelect = useCallback(
    (feedUrl: string) => {
      const normalizedUrl = normalizeUrl(feedUrl);
      // We can also set active feed in store if needed
      setActiveFeed(normalizedUrl);
      // Clear any local search
      setSearchQuery("");
      setAppliedSearchQuery("");

      // Navigate: manually or with next/navigation's router.push
      const newUrl = `/web?feed=${encodeURIComponent(normalizedUrl)}`;
      router.push(newUrl);
    },
    [router, setActiveFeed]
  );

  /**
   * Searching logic from your CommandBar
   */
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleApplySearch = useCallback((value: string) => {
    setAppliedSearchQuery(value);
  }, []);

  const handleSeeAllMatches = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "grid" ? "masterDetail" : "grid"));
  }, []);

  /**
   * Filtering items by feedUrl (decoded from query param).
   */
  const searchLower = useMemo(
    () => (appliedSearchQuery ? appliedSearchQuery.toLowerCase() : ""),
    [appliedSearchQuery]
  );

  // Key that changes when feed/search filter changes — forces Masonry remount to clear stale position cache
  const filterKey = `${feedUrlDecoded}::${searchLower}`;

  /**
   * Single-pass categorization of feed items.
   * Replaces separate filteredItems, articleItems, podcastItems, readLaterItems,
   * and unread count memos with one loop.
   */
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
      // Feed URL filter
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) continue;
      // Search filter
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
    router.push("/web");
  }, [router]);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value as FeedTabKey);
  }, []);
  const tabsContentClassName = ["mt-0", viewMode === "masterDetail" && "flex-1 min-h-0"]
    .filter(Boolean)
    .join(" ");
  const tabConfig: FeedTabConfig[] = [
    { value: "all", label: "All", count: categorized.all.length, items: categorized.all },
    {
      value: "unread",
      label: "Unread",
      count: filteredUnreadItems.length,
      items: filteredUnreadItems,
      triggerClassName: "relative",
    },
    {
      value: "articles",
      label: "Articles",
      count: categorized.unreadArticleCount,
      items: categorized.articles,
    },
    {
      value: "podcasts",
      label: "Podcasts",
      count: categorized.unreadPodcastCount,
      items: categorized.podcasts,
    },
    {
      value: "readLater",
      label: "Read Later",
      count: categorized.unreadReadLaterCount,
      items: categorized.readLater,
    },
  ];

  return (
    <div
      className={["w-full px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3", masterDetailContainerClass]
        .filter(Boolean)
        .join(" ")}
    >
      <Tabs
        defaultValue="unread"
        className={["flex flex-col gap-3 sm:gap-4", masterDetailTabsClass]
          .filter(Boolean)
          .join(" ")}
        value={selectedTab}
        onValueChange={handleTabChange}
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
              {tabConfig.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className={tab.triggerClassName}>
                  {tab.label}
                  {tab.count > 0 && ` (${tab.count})`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <CommandBar
              value={searchQuery}
              onChange={handleSearch}
              onApplySearch={handleApplySearch}
              onSeeAllMatches={handleSeeAllMatches}
              handleRefresh={handleRefresh}
              onFeedSelect={handleFeedSelect}
              items={feedItems}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setSettingsOpen(true)}
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
              aria-label={
                viewMode === "grid" ? "Switch to Master-Detail view" : "Switch to Grid view"
              }
              title={viewMode === "grid" ? "Switch to Master-Detail view" : "Switch to Grid view"}
            >
              {viewMode === "grid" ? (
                <Columns className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
            <RefreshButton onClick={handleRefresh} isLoading={refreshing} />
          </div>
        </div>

        {tabConfig.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className={tabsContentClassName}>
            <FeedTabContent
              items={tab.items}
              isLoading={isLoading}
              viewMode={viewMode}
              filterKey={filterKey}
              hasSubscriptions={hasSubscriptions}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          hideCloseButton
          className="h-[92dvh] w-[96vw] max-w-6xl gap-0 overflow-hidden border bg-background p-0 data-[state=open]:duration-200 data-[state=closed]:duration-150 data-[state=open]:ease-out data-[state=closed]:ease-out motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        >
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <SettingsShell variant="modal">
            <WebSettingsTabs />
          </SettingsShell>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A small wrapper for your FeedGrid or empty state logic. */
function FeedTabContent({
  items,
  isLoading,
  viewMode,
  filterKey,
  hasSubscriptions,
}: {
  items: FeedItem[];
  isLoading: boolean;
  viewMode: "grid" | "masterDetail";
  filterKey: string;
  hasSubscriptions: boolean;
}) {
  if (isLoading) {
    return <FeedGrid items={[]} isLoading />;
  }
  if (!items || items.length === 0) {
    // Show different message based on whether user has feeds configured
    return hasSubscriptions ? <EmptyStateAllCaughtUp /> : <EmptyStateNoFeeds />;
  }

  return viewMode === "grid" ? (
    <FeedGrid items={items} isLoading={false} filterKey={filterKey} />
  ) : (
    <FeedMasterDetail items={items} isLoading={false} />
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
