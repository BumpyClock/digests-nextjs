"use client"

import { useState, useCallback, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFeedManagement } from "@/hooks/use-feed-management"
import { SearchBar } from "@/components/SearchBar"
import { RefreshButton } from "@/components/RefreshButton"
import { EmptyState } from "@/components/EmptyState"
import { FeedGrid } from "@/components/FeedGrid"
import { Feed } from "@/lib/rss"

export default function AppPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { feeds, loading, refreshing, refreshFeeds } = useFeedManagement()

  const filteredFeeds = useMemo(() => {
    const searchLower = searchQuery.toLowerCase()
    return feeds.filter((feed) => {
      return (
        (feed.title && feed.title.toLowerCase().includes(searchLower)) ||
        (feed.description && feed.description.toLowerCase().includes(searchLower)) ||
        (feed.siteTitle && feed.siteTitle.toLowerCase().includes(searchLower))
      )
    })
  }, [feeds, searchQuery])

  const articleFeeds = useMemo(() => 
    filteredFeeds.filter((feed) => feed.type === "article"),
    [filteredFeeds]
  )

  const podcastFeeds = useMemo(() => 
    filteredFeeds.filter((feed) => feed.type === "podcast"),
    [filteredFeeds]
  )

  const favoriteFeeds = useMemo(() => 
    filteredFeeds.filter((feed) => feed.favorite),
    [filteredFeeds]
  )

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  return (
    <div id="feed-container" className="flex flex-col h-full">
      <div className="container py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Your Feeds</h1>
          <div className="flex w-full sm:w-auto gap-2">
            <SearchBar value={searchQuery} onChange={handleSearch} />
            <RefreshButton onClick={refreshFeeds} isLoading={loading || refreshing} />
          </div>
        </div>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="h-[calc(100vh-11rem)]">
            {loading ? (
              <FeedGrid feeds={[]} isLoading={true} />
            ) : feeds.length === 0 ? (
              <EmptyState />
            ) : (
              <FeedGrid feeds={filteredFeeds} isLoading={false} />
            )}
          </TabsContent>

          <TabsContent value="articles" className="h-[calc(100vh-11rem)]">
            <FeedGrid 
              feeds={articleFeeds} 
              isLoading={loading} 
              skeletonCount={6} 
            />
          </TabsContent>

          <TabsContent value="podcasts" className="h-[calc(100vh-11rem)]">
            <FeedGrid 
              feeds={podcastFeeds} 
              isLoading={loading} 
              skeletonCount={3} 
            />
          </TabsContent>

          <TabsContent value="favorites" className="h-[calc(100vh-11rem)]">
            <FeedGrid 
              feeds={favoriteFeeds} 
              isLoading={loading} 
              skeletonCount={4} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

