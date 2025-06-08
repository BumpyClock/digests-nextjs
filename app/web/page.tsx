"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid";
import { FeedMasterDetail } from "@/components/Feed/FeedMasterDetail/FeedMasterDetail";
import { useWebPageData } from "@/hooks/useFeedSelectors";
import { FeedItem } from "@/types";

import { CommandBar } from "@/components/CommandBar/CommandBar";
import { RefreshButton } from "@/components/RefreshButton";
import { useSearchParams } from "next/navigation";
import { Logger } from "@/utils/logger";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Columns } from "lucide-react";
import { FEED_REFRESHED_EVENT } from "@/components/Feed/FeedGrid/FeedGrid";
import { normalizeUrl } from "@/utils/url";

// React Query imports
import { useFeedsQuery, useRefreshFeedsMutation, useFeedBackgroundSync } from "@/hooks/queries";
import { useFeedStore } from "@/store/useFeedStore";
import { toast } from "sonner";

/**
 * If your store has a "hydrated" field, we can track if it's
 * fully loaded, or just remove if you don't need it.
 */
const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);
  const { hydrated: storeHydrated } = useWebPageData();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHydrated(true);
    }
  }, []);

  return hydrated && storeHydrated;
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
  const [selectedTab, setSelectedTab] = useState("unread");
  const [viewMode, setViewMode] = useState<"grid" | "masterDetail">("grid");
  const refreshedRef = useRef(false);
  const [stableUnreadItems, setStableUnreadItems] = useState<FeedItem[]>([]);

  const searchParams = useSearchParams();
  // Grab ?feed=...
  const feedParam = searchParams.get("feed");
  // Normalize/trim the feed URL
  const feedUrlDecoded = feedParam ? normalizeUrl(feedParam) : "";

  // React Query hooks for server state
  const feedsQuery = useFeedsQuery();
  const refreshMutation = useRefreshFeedsMutation();
  const { data: backgroundSyncData, clearNotification } = useFeedBackgroundSync();

  // Zustand hooks for client state only
  const {
    initialized,
    setInitialized,
    setActiveFeed,
    getReadLaterItems,
  } = useWebPageData();
  
  // Get read items set for unread filtering
  const readItems = useFeedStore(state => state.readItems);

  // React Query is now the single source of truth for server state
  const feedItems = feedsQuery.data?.items || [];
  const existingFeeds = useFeedStore(state => state.feeds);
  const loading = feedsQuery.isLoading || (!initialized && existingFeeds.length > 0 && feedItems.length === 0);
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
   * Calculate current unread items (used for tab counts, but not for display on unread tab)
   */
  const currentUnreadItems = useMemo(() => {
    if (!feedItems.length) return [];
    const readItemsSet = readItems instanceof Set ? readItems : new Set();
    return feedItems.filter(item => !readItemsSet.has(item.id));
  }, [feedItems, readItems]);

  /**
   * Update stable unread items only when feedItems change (on refresh)
   * This keeps unread page content stable even when items are marked as read
   */
  useEffect(() => {
    if (feedItems.length > 0) {
      // Use read items state at the time of refresh, not current reactive state
      const readItemsAtRefresh = readItems instanceof Set ? readItems : new Set();
      const unreadAtRefresh = feedItems.filter(item => !readItemsAtRefresh.has(item.id));
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
  }, [isHydrated, initialized, currentUnreadItems]);

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
      }
    });
  }, [refreshMutation, clearNotification]);

  /**
   * Handle background sync notifications
   */
  useEffect(() => {
    if (backgroundSyncData?.hasNewItems) {
      toast("New items available", {
        description: `${backgroundSyncData.count} new item${backgroundSyncData.count === 1 ? '' : 's'} available`,
        action: {
          label: "Refresh",
          onClick: handleRefresh
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
      window.history.pushState({}, "", newUrl);
    },
    [setActiveFeed]
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
    setViewMode(prev => prev === "grid" ? "masterDetail" : "grid");
  }, []);

  /**
   * Filtering items by feedUrl (decoded from query param).
   */
  const filteredItems = useMemo(() => {
    if (!feedItems || !Array.isArray(feedItems)) return [];
    return feedItems.filter((item) => {
      if (!item?.id) return false;

      // Check feed URL match
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) {
        return false;
      }

      // If there's a typed search query, filter by that as well
      if (appliedSearchQuery) {
        const searchLower = appliedSearchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [feedItems, feedUrlDecoded, appliedSearchQuery]);

  const filteredUnreadItems = useMemo(() => {
    if (!stableUnreadItems || !Array.isArray(stableUnreadItems)) return [];
    return stableUnreadItems.filter((item) => {
      if (!item?.id) return false;
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) {
        return false;
      }
      if (appliedSearchQuery) {
        const searchLower = appliedSearchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [stableUnreadItems, feedUrlDecoded, appliedSearchQuery]);

  const articleItems = useMemo(() => {
    return filteredItems.filter((i) => i?.type === "article");
  }, [filteredItems]);

  const podcastItems = useMemo(() => {
    return filteredItems.filter((i) => i?.type === "podcast");
  }, [filteredItems]);

  // Reusable filtering function for unread items by type
  const filterUnreadItemsByType = useCallback((itemType: "article" | "podcast") => {
    if (!currentUnreadItems || !Array.isArray(currentUnreadItems)) return [];
    return currentUnreadItems.filter((item) => {
      if (!item?.id) return false;
      if (feedUrlDecoded && normalizeUrl(item.feedUrl) !== feedUrlDecoded) return false;
      if (appliedSearchQuery) {
        const searchLower = appliedSearchQuery.toLowerCase();
        if (!(item.title?.toLowerCase().includes(searchLower) || 
              item.description?.toLowerCase().includes(searchLower))) return false;
      }
      return item?.type === itemType;
    });
  }, [currentUnreadItems, feedUrlDecoded, appliedSearchQuery]);

  // For tab counts, use current reactive unread items to show accurate counts
  const currentUnreadArticleItems = useMemo(() => {
    return filterUnreadItemsByType("article");
  }, [filterUnreadItemsByType]);

  const currentUnreadPodcastItems = useMemo(() => {
    return filterUnreadItemsByType("podcast");
  }, [filterUnreadItemsByType]);

  const readLaterItems = useMemo(() => {
    return getReadLaterItems();
  }, [getReadLaterItems]);

  const clearFeedFilter = useCallback(() => {
    window.history.pushState({}, "", "/web"); // or just /web
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  return (
    <div className="container pt-6 max-w-[1600px] mx-auto max-h-screen">
      <Tabs
        defaultValue="unread"
        className="space-y-6"
        value={selectedTab}
        onValueChange={handleTabChange}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mx-auto gap-4">
          <div className="flex items-center gap-4">
            {feedUrlDecoded && (
              <button
                onClick={clearFeedFilter}
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
              >
                <span>×</span> Clear Feed Filter
              </button>
            )}
            <TabsList>
              <TabsTrigger value="all">
                All
                {feedItems.length > 0 && ` (${feedItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="unread" className="relative">
                Unread
                {currentUnreadArticleItems.length > 0 &&
                  ` (${currentUnreadArticleItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="articles">
                Articles
                {articleItems.length > 0 && ` (${articleItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="podcasts">
                Podcasts
                {currentUnreadPodcastItems.length > 0 && ` (${currentUnreadPodcastItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="readLater">
                Read Later
                {readLaterItems.length > 0 && ` (${readLaterItems.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CommandBar
              value={searchQuery}
              onChange={handleSearch}
              onApplySearch={handleApplySearch}
              onSeeAllMatches={handleSeeAllMatches}
              handleRefresh={handleRefresh}
              onFeedSelect={handleFeedSelect}
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleViewMode}
              title={viewMode === "grid" ? "Switch to Master-Detail view" : "Switch to Grid view"}
            >
              {viewMode === "grid" ? <Columns className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            <RefreshButton
              onClick={handleRefresh}
              isLoading={refreshing}
            />
          </div>
        </div>

        <TabsContent value="all" className="h-[calc(100vh-11rem)]">
          <FeedTabContent 
            items={filteredItems}
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="unread" className="h-[calc(100vh-11rem)]">
          <FeedTabContent
            items={filteredUnreadItems}
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="articles" className="h-[calc(100vh-11rem)]">
          <FeedTabContent 
            items={articleItems} 
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="podcasts" className="h-[calc(100vh-11rem)]">
          <FeedTabContent 
            items={podcastItems} 
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="readLater" className="h-[calc(100vh-11rem)]">
          <FeedTabContent 
            items={readLaterItems} 
            isLoading={isLoading}
            viewMode={viewMode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A small wrapper for your FeedGrid or empty state logic. */
function FeedTabContent({
  items,
  isLoading,
  viewMode,
}: {
  items: FeedItem[];
  isLoading: boolean;
  viewMode: "grid" | "masterDetail";
}) {
  if (isLoading) {
    return <FeedGrid items={[]} isLoading />;
  }
  if (!items || items.length === 0) {
    return <EmptyState />;
  }
  
  return viewMode === "grid" ? (
    <FeedGrid items={items} isLoading={false} />
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
