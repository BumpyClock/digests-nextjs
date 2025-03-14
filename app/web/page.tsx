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
  const { 
    feedItems, 
    loading, 
    refreshing, 
    refreshFeeds,
    initialized,
    setInitialized 
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

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    console.log('Refreshing feeds...')
    refreshFeeds()
  }, [refreshFeeds])

  // Update filteredItems to allow all items while typing
  const filteredItems = useMemo(() => {
    try {
      if (!feedItems || !Array.isArray(feedItems)) return []
      
      // Return all items regardless of search query
      return feedItems.filter((item) => {
        if (!item || !item.id || item.id === '') return false // Skip items with empty IDs
        return true; // Return all items
      });
    } catch (error) {
      console.error('Error filtering items:', error)
      return []
    }
  }, [feedItems])

  const articleItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "article"
    }), 
    [filteredItems]
  )

  const podcastItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.type === "podcast"
    }), 
    [filteredItems]
  )

  const favoriteItems = useMemo(() => 
    filteredItems.filter((item) => {
      if (!item || !item.id) return false
      return item.favorite
    }), 
    [filteredItems]
  )

  // Handle search query update from CommandBox
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Handle "See All Matches" action
  const handleSeeAllMatches = useCallback(() => {
    // This will apply the current search query to the main feed display
    setSearchQuery(searchQuery);
  }, [searchQuery]);

  const isLoading = loading || (!initialized && feedItems.length === 0)

  return (
    <div className="container py-6 max-w-[1600px] mx-auto max-h-screen ">
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mx-auto gap-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              {feedItems.length > 0 && ` (${feedItems.length})`}
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CommandBox 
              value={searchQuery} 
              onChange={handleSearch} 
              onSeeAllMatches={handleSeeAllMatches}
              handleRefresh={handleRefresh}
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

