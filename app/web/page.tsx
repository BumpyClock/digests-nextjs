"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchBar } from "@/components/SearchBar"
import { RefreshButton } from "@/components/RefreshButton"
import { EmptyState } from "@/components/EmptyState"
import { FeedGrid } from "@/components/Feed/FeedGrid/FeedGrid"
import { useFeedStore } from "@/store/useFeedStore"

const useHydration = () => {
  const [hydrated, setHydrated] = useState(false)
  const storeHydrated = useFeedStore(state => state.hydrated)
  
  useEffect(() => {
    setHydrated(true)
  }, [])
  
  return hydrated && storeHydrated
}

export default function AppPage() {
  const isHydrated = useHydration()
  const [searchQuery, setSearchQuery] = useState("")
  const { 
    feeds,
    feedItems, 
    loading, 
    refreshing, 
    refreshFeeds,
    initialized,
    setInitialized 
  } = useFeedStore()

  useEffect(() => {
    if (isHydrated && !initialized) {
      console.log('Initializing store...', { feeds: feeds.length, items: feedItems.length })
      refreshFeeds().then(() => {
        setInitialized(true)
        console.log('Store initialized', { feeds: feeds.length, items: feedItems.length })
      })
    }
  }, [isHydrated, initialized, refreshFeeds, setInitialized, feeds.length, feedItems.length])

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

        <TabsContent value="all" className="h-[calc(100vh-11rem)] ">
          {isLoading ? (
            <FeedGrid items={[]} isLoading={true} />
          ) : feedItems.length === 0 ? (
            <EmptyState />
          ) : (
            <FeedGrid items={filteredItems} isLoading={false}  />
          )}
        </TabsContent>

        <TabsContent value="articles" className="h-[calc(100vh-11rem)] ">
          <FeedGrid 
            items={articleItems} 
            isLoading={isLoading} 
            skeletonCount={6} 
          
          />
        </TabsContent>

        <TabsContent value="podcasts" className="h-[calc(100vh-11rem)] ">
          <FeedGrid 
            items={podcastItems} 
            isLoading={isLoading} 
            skeletonCount={3} 
           
          />
        </TabsContent>

        <TabsContent value="favorites" className="h-[calc(100vh-11rem)] ">
          <FeedGrid 
            items={favoriteItems} 
            isLoading={isLoading} 
            skeletonCount={4} 
          
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

