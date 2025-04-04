"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid";
import { FeedMasterDetail } from "@/components/Feed/FeedMasterDetail/FeedMasterDetail";
import { useFeedStore } from "@/store/useFeedStore";
import { FeedItem } from "@/types";

import { CommandBar } from "@/components/CommandBar/CommandBar";
import { RefreshButton } from "@/components/RefreshButton";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Columns } from "lucide-react";

/**
 * If your store has a "hydrated" field, we can track if it's
 * fully loaded, or just remove if you don't need it.
 */
const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);
  const storeHydrated = useFeedStore((state) => state.hydrated);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHydrated(true);
    }
  }, []);

  return hydrated && storeHydrated;
};

const normalizeUrl = (url: string | null): string => {
  if (!url) return "";
  try {
    // decode + strip trailing slash
    return decodeURIComponent(url).replace(/\/+$/, "");
  } catch {
    // fallback if decode fails, just remove slash
    return url.replace(/\/+$/, "");
  }
};

// Create a new component that uses useSearchParams
function WebPageContent() {
  const isHydrated = useHydration();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("unread");
  const [stableUnreadItems, setStableUnreadItems] = useState<FeedItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "masterDetail">("grid");
  const refreshedRef = useRef(false);

  const searchParams = useSearchParams();
  // Grab ?feed=...
  const feedParam = searchParams.get("feed");
  // Normalize/trim the feed URL
  const feedUrlDecoded = feedParam ? normalizeUrl(feedParam) : "";

  const {
    feedItems,
    loading,
    refreshing,
    refreshFeeds,
    initialized,
    setInitialized,
    getUnreadItems,
    setActiveFeed,
  } = useFeedStore();

  /**
   * If your store needs an initial fetch, run it once.
   */
  useEffect(() => {
    if (isHydrated && !initialized) {
      console.log("Initializing store...");
      refreshFeeds()
        .then(() => {
          setInitialized(true);
          console.log("Store initialized");
        })
        .catch((error) => {
          console.error("Failed to initialize store:", error);
          setInitialized(true);
        });
    }
  }, [isHydrated, initialized, refreshFeeds, setInitialized]);

  /**
   * On mount (or after store is hydrated), capture unread items.
   * Just an example pattern; adapt as needed.
   */
  useEffect(() => {
    if (isHydrated && initialized && !refreshedRef.current) {
      const currentUnreadItems = getUnreadItems();
      setStableUnreadItems(currentUnreadItems);
      refreshedRef.current = true;
    }
  }, [isHydrated, initialized, getUnreadItems]);

  /**
   *  Handler to refresh feeds
   */
  const handleRefresh = useCallback(() => {
    console.log("Refreshing feeds...");
    refreshFeeds().then(() => {
      const currentUnreadItems = getUnreadItems();
      setStableUnreadItems(currentUnreadItems);
      refreshedRef.current = true;
    });
  }, [refreshFeeds, getUnreadItems]);

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

  const filteredStableUnreadItems = useMemo(() => {
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

  const unreadArticleItems = useMemo(() => {
    return filteredStableUnreadItems.filter((i) => i?.type === "article");
  }, [filteredStableUnreadItems]);

  const podcastItems = useMemo(() => {
    return filteredItems.filter((i) => i?.type === "podcast");
  }, [filteredItems]);

  const unreadPodcastItems = useMemo(() => {
    return filteredStableUnreadItems.filter((i) => i?.type === "podcast");
  }, [filteredStableUnreadItems]);

  const favoriteItems = useMemo(() => {
    return filteredItems.filter((i) => i?.favorite);
  }, [filteredItems]);

  const clearFeedFilter = useCallback(() => {
    window.history.pushState({}, "", "/web"); // or just /web
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  const isLoading = loading || (!initialized && feedItems.length === 0);

  return (
    <div className="container py-6 max-w-[1600px] mx-auto max-h-screen">
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
                {unreadArticleItems.length > 0 &&
                  ` (${unreadArticleItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="articles">
                Articles
                {articleItems.length > 0 && ` (${articleItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="podcasts">
                Podcasts
                {unreadPodcastItems.length > 0 && ` (${unreadPodcastItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="favorites">
                Favorites
                {favoriteItems.length > 0 && ` (${favoriteItems.length})`}
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
              isLoading={loading || refreshing}
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
            items={filteredStableUnreadItems}
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

        <TabsContent value="favorites" className="h-[calc(100vh-11rem)]">
          <FeedTabContent 
            items={favoriteItems} 
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
