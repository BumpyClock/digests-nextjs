"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchBar } from "@/components/SearchBar"
import { RefreshButton } from "@/components/RefreshButton"
import { EmptyState } from "@/components/EmptyState"
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid"
import { useFeedStore } from "@/store/useFeedStore"
import { FeedItem } from "@/types"

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
    return null // Return null on server and during initial client render
  }

  return isLoading ? (
    <FeedGrid items={[]} isLoading={true} />
  ) : items.length === 0 ? (
    <EmptyState />
  ) : (
    <FeedGrid items={items} isLoading={false} />
  )
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

  const filteredItems = useMemo(() => {
    const searchLower = searchQuery.toLowerCase()
    return feedItems.filter((item) => {
      return (
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.feedTitle && item.feedTitle.toLowerCase().includes(searchLower))
      )
    })
  }, [feedItems, searchQuery])

  const articleItems = useMemo(() => 
    filteredItems.filter((item) => item.type === "article"), 
    [filteredItems]
  )

  const podcastItems = useMemo(() => 
    filteredItems.filter((item) => item.type === "podcast"), 
    [filteredItems]
  )

  const favoriteItems = useMemo(() => 
    filteredItems.filter((item) => item.favorite), 
    [filteredItems]
  )

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

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
            <SearchBar value={searchQuery} onChange={handleSearch} />
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

