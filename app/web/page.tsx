"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshButton } from "@/components/RefreshButton"
import { EmptyState } from "@/components/EmptyState"
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid"
import { useFeedStore } from "@/store/useFeedStore"
import { FeedItem } from "@/types"

import { CommandBox } from "@/components/CommandBox/CommandBox"

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

const TabContent = ({ items, isLoading }: { items: FeedItem[], isLoading: boolean }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  try{

  
  // Ensure all items have required properties and non-empty IDs
  const validItems = items.filter(item => {
    return item && 
           typeof item === 'object' && 
           'id' in item && 
           item.id !== undefined && 
           item.id !== ''
  })
  
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

export default function AppPage() {
  const isHydrated = useHydration()
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [selectedFeedLink, setSelectedFeedLink] = useState<string | null>(null)
  const { 
    feedItems, 
    loading, 
    refreshing, 
    refreshFeeds,
    initialized,
    setInitialized,
    readItems,
    getUnreadItems
  } = useFeedStore()

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

  // Add this useEffect to handle URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const feedParam = params.get('feed')
      setSelectedFeedLink(feedParam)
    }
  }, [])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    console.log('Refreshing feeds...')
    refreshFeeds()
  }, [refreshFeeds])

  // Add handler for feed selection
  const handleFeedSelect = useCallback((feedUrl: string) => {
    setSelectedFeedLink(feedUrl);
    // Update URL without navigation
    const newUrl = `/?feed=${encodeURIComponent(feedUrl)}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  // Handle search query update from CommandBox (only updates the input value, not filtering)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Apply the search query (for filtering) when user confirms
  const handleApplySearch = useCallback((value: string) => {
    setAppliedSearchQuery(value);
  }, []);

  // Handle "See All Matches" action
  const handleSeeAllMatches = useCallback(() => {
    // Apply the current search query to the main feed display
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  // Get all unread items
  const unreadItems = useMemo(() => {
    return getUnreadItems();
  }, [getUnreadItems, readItems]);

  // Update filteredItems to use appliedSearchQuery instead of searchQuery
  const filteredItems = useMemo(() => {
    try {
      if (!feedItems || !Array.isArray(feedItems)) return []
      
      return feedItems.filter((item) => {
        // Basic validation
        if (!item || !item.id || item.id === '') return false

        // Filter by selected feed if one is selected
        if (selectedFeedLink && item.feedUrl !== selectedFeedLink) {
          return false
        }

        // Filter by search query if one exists
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

  // Filter the unread items
  const filteredUnreadItems = useMemo(() => {
    try {
      if (!unreadItems || !Array.isArray(unreadItems)) return []
      
      return unreadItems.filter((item) => {
        // Basic validation
        if (!item || !item.id || item.id === '') return false

        // Filter by selected feed if one is selected
        if (selectedFeedLink && item.feedUrl !== selectedFeedLink) {
          return false
        }

        // Filter by search query if one exists
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
      console.error('Error filtering unread items:', error)
      return []
    }
  }, [unreadItems, selectedFeedLink, appliedSearchQuery]);

  // Add clear filter function
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
    filteredUnreadItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "article"
    }), 
    [filteredUnreadItems]
  )

  const podcastItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "podcast"
    }), 
    [filteredItems]
  )

  const unreadPodcastItems = useMemo(() => 
    filteredUnreadItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "podcast"
    }), 
    [filteredUnreadItems]
  )

  const favoriteItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.favorite
    }), 
    [filteredItems]
  )

  const isLoading = loading || (!initialized && feedItems.length === 0)

  return (
    <div className="container py-6 max-w-[1600px] mx-auto max-h-screen ">
      <Tabs defaultValue="unread" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mx-auto gap-4">
          {/* Add clear filter button when a feed is selected */}
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
              <TabsTrigger value="unread">
                Unread
                {unreadItems.length > 0 && ` (${unreadItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="articles">
                Articles
                {articleItems.length > 0 && ` (${articleItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="podcasts">
                Podcasts
                {podcastItems.length > 0 && ` (${podcastItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="favorites">
                Favorites
                {favoriteItems.length > 0 && ` (${favoriteItems.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CommandBox 
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
          <TabContent items={filteredUnreadItems} isLoading={isLoading} />
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

