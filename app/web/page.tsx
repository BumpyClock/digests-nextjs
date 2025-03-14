"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/EmptyState"
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid"
import { useFeedStore } from "@/store/useFeedStore"
import { FeedItem } from "@/types"

import { CommandBar } from "@/components/CommandBar/CommandBar"
import { RefreshButton } from "@/components/RefreshButton"

/**
 * Custom hook to manage hydration state.
 * @returns {boolean} - Indicates if the store is hydrated.
 */
const useHydration = () => {
  const [hydrated, setHydrated] = useState(false)
  const storeHydrated = useFeedStore(state => state.hydrated)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHydrated(true)
    }
  }, [])
  
  return hydrated && storeHydrated
}

/**
 * Component to render tab content.
 * @param {Object} props - Component props.
 * @param {FeedItem[]} props.items - List of feed items.
 * @param {boolean} props.isLoading - Loading state.
 * @returns {JSX.Element} - Rendered tab content.
 */
const TabContent = ({ items, isLoading }: { items: FeedItem[], isLoading: boolean }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  try {
    const validItems = items.filter(item => item && typeof item === 'object' && 'id' in item && item.id !== undefined && item.id !== '')
    
    if (isLoading) {
      return <FeedGrid items={[]} isLoading={true} />
    }

    if (validItems.length === 0) {
      return <EmptyState />
    }

    return <FeedGrid items={validItems} isLoading={false} />
  } catch (error) {
    console.error('Error rendering TabContent:', error)
    return <EmptyState />
  }
}

const normalizeUrl = (url: string | null): string => {
  if (!url) return '';
  try {
    return decodeURIComponent(url).replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
};

export default function AppPage() {
  const isHydrated = useHydration()
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [selectedFeedLink, setSelectedFeedLink] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("unread")
  const [stableUnreadItems, setStableUnreadItems] = useState<FeedItem[]>([])
  const refreshedRef = useRef(false)
  
  const { 
    feedItems, 
    loading, 
    refreshing, 
    refreshFeeds,
    initialized,
    setInitialized,
    getUnreadItems,
    setActiveFeed
  } = useFeedStore()

  useEffect(() => {
    if (isHydrated && initialized && !refreshedRef.current) {
      console.log('Synchronizing unread items...')
      const currentUnreadItems = getUnreadItems()
      setStableUnreadItems(currentUnreadItems)
      refreshedRef.current = true
    }
  }, [isHydrated, initialized, getUnreadItems])

  useEffect(() => {
    if (isHydrated && !initialized) {
      console.log('Initializing store...')
      refreshFeeds()
        .then(() => {
          setInitialized(true)
          console.log('Store initialized')
        })
        .catch(error => {
          console.error('Failed to initialize store:', error)
          setInitialized(true)
        })
    }
  }, [isHydrated, initialized, refreshFeeds, setInitialized])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const feedParam = params.get('feed');
      if (feedParam) {
        const normalizedUrl = normalizeUrl(feedParam);
        setSelectedFeedLink(normalizedUrl);
        setActiveFeed(normalizedUrl);
      }
    }
  }, []);

  /**
   * Handles manual refresh of feeds and updates stable unread items.
   */
  const handleRefresh = useCallback(() => {
    console.log('Refreshing feeds...')
    refreshFeeds().then(() => {
      const currentUnreadItems = getUnreadItems()
      setStableUnreadItems(currentUnreadItems)
      refreshedRef.current = true
    })
  }, [refreshFeeds, getUnreadItems])

  /**
   * Handles feed selection and updates the URL.
   * @param {string} feedUrl - The URL of the selected feed.
   */
  const handleFeedSelect = useCallback((feedUrl: string) => {
    const normalizedUrl = normalizeUrl(feedUrl);
    setSelectedFeedLink(normalizedUrl);
    setSearchQuery("");
    setAppliedSearchQuery("");
    const newUrl = `/web?feed=${encodeURIComponent(normalizedUrl)}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  /**
   * Marks all items as read and updates stable unread items.
   */
  // const handleMarkAllAsRead = useCallback(() => {
  //   const { markAllAsRead } = useFeedStore.getState();
  //   markAllAsRead();
  //   setStableUnreadItems([]);
  // }, []);
  
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleApplySearch = useCallback((value: string) => {
    setAppliedSearchQuery(value);
  }, []);

  const handleSeeAllMatches = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  const unreadItems = useMemo(() => {
    return getUnreadItems();
  }, [getUnreadItems]);

  const filteredItems = useMemo(() => {
    try {
      if (!feedItems || !Array.isArray(feedItems)) return []
      
      return feedItems.filter((item) => {
        if (!item || !item.id || item.id === '') return false
        
        if (selectedFeedLink && normalizeUrl(item.feedUrl) !== normalizeUrl(selectedFeedLink)) {
          return false
        }
        if (appliedSearchQuery) {
          const searchLower = appliedSearchQuery.toLowerCase()
          return (
            (item.title?.toLowerCase().includes(searchLower)) ||
            (item.description?.toLowerCase().includes(searchLower))
          )
        }
        return true
      })
    } catch (error) {
      console.error('Error filtering items:', error)
      return []
    }
  }, [feedItems, selectedFeedLink, appliedSearchQuery]);

  const filteredStableUnreadItems = useMemo(() => {
    try {
      if (!stableUnreadItems || !Array.isArray(stableUnreadItems)) return []
      
      return stableUnreadItems.filter((item) => {
        if (!item || !item.id || item.id === '') return false
        if (selectedFeedLink && item.feedUrl !== selectedFeedLink) {
          return false
        }
        if (appliedSearchQuery) {
          const searchLower = appliedSearchQuery.toLowerCase()
          return (
            (item.title?.toLowerCase().includes(searchLower)) ||
            (item.description?.toLowerCase().includes(searchLower))
          )
        }
        return true
      })
    } catch (error) {
      console.error('Error filtering stable unread items:', error)
      return []
    }
  }, [stableUnreadItems, selectedFeedLink, appliedSearchQuery]);

  const clearFeedFilter = useCallback(() => {
    setSelectedFeedLink(null)
    window.history.pushState({}, '', '/')
  }, [])

  const articleItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "article"
    }), 
    [filteredItems]
  )

  const unreadArticleItems = useMemo(() => 
    filteredStableUnreadItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "article"
    }), 
    [filteredStableUnreadItems]
  )

  const podcastItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "podcast"
    }), 
    [filteredItems]
  )

  const unreadPodcastItems = useMemo(() => 
    filteredStableUnreadItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "podcast"
    }), 
    [filteredStableUnreadItems]
  )

  const favoriteItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.favorite
    }), 
    [filteredItems]
  )

  const isLoading = loading || (!initialized && feedItems.length === 0)

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  return (
    <div className="container py-6 max-w-[1600px] mx-auto max-h-screen ">
      <Tabs 
        defaultValue="unread" 
        className="space-y-6"
        value={selectedTab}
        onValueChange={handleTabChange}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mx-auto gap-4">
          <div className="flex items-center gap-4">
            {selectedFeedLink && (
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
                {unreadItems.length > 0 && (
                  selectedTab === "unread" 
                    ? ` (${filteredStableUnreadItems.length})` 
                    : ` (${unreadItems.length})`
                )}
                {unreadItems.length > 0 && selectedTab !== "unread" && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="articles">
                Articles
                {articleItems.length > 0 && (selectedTab === "articles" ? ` (${articleItems.length})` : ` (${filteredStableUnreadItems.length})`)}
                {unreadArticleItems.length > 0 && selectedTab !== "articles" && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="podcasts">
                Podcasts
                {podcastItems.length > 0 && (selectedTab === "podcasts" ? ` (${podcastItems.length})` : ` (${filteredStableUnreadItems.length})`)}
                {unreadPodcastItems.length > 0 && selectedTab !== "podcasts" && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="favorites">
                Favorites
                {favoriteItems.length > 0 && (selectedTab === "favorites" ? ` (${favoriteItems.length})` : ` (${filteredStableUnreadItems.length})`)}
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
            <RefreshButton 
              onClick={handleRefresh} 
              isLoading={loading || refreshing} 
            />
          </div>
        </div>

        <TabsContent value="all" className="h-[calc(100vh-11rem)]">
          <TabContent items={filteredItems} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="unread" className="h-[calc(100vh-11rem)]">
          <TabContent items={filteredStableUnreadItems} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="articles" className="h-[calc(100vh-11rem)]">
          <TabContent items={articleItems} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="podcasts" className="h-[calc(100vh-11rem)]">
          <TabContent items={podcastItems} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="favorites" className="h-[calc(100vh-11rem)]">
          <TabContent items={favoriteItems} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

