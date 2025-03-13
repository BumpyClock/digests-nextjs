"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { Masonry } from "masonic"
import { useToast } from "@/hooks/use-toast"
import { FeedCard } from "@/components/Feed/FeedCard/FeedCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useWindowSize } from "@/hooks/use-window-size"
import { useFeedStore } from "@/store/useFeedStore"
import { FeedItem } from "@/types"
import { ToastAction } from "@/components/ui/toast"
import dynamic from 'next/dynamic'
import loadingAnimation from "@/public/assets/animations/feed-loading.json"

// Dynamically import Lottie with SSR disabled and loading fallback
const Lottie = dynamic(() => import('lottie-react'), { 
  ssr: false,
  loading: () => (
    <div className="w-64 h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
})

interface FeedGridProps {
  items: FeedItem[]
  isLoading: boolean
  skeletonCount?: number
}

const LoadingAnimation = () => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="w-64 h-64">
        {isMounted && (
          <Lottie animationData={loadingAnimation} loop={true} />
        )}
      </div>
    </div>
  )
}

export function FeedGrid({ items, isLoading }: FeedGridProps) {
  const { toast } = useToast()
  const { checkForUpdates, refreshFeeds } = useFeedStore()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { width } = useWindowSize()
  const [isMinLoadingComplete, setIsMinLoadingComplete] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Add minimum loading time of 2 seconds
    const timer = setTimeout(() => {
      setIsMinLoadingComplete(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])
  
  useEffect(() => {
    if (!mounted) return

    const checkUpdates = async () => {
      const { hasNewItems, count } = await checkForUpdates()
      
      if (hasNewItems) {
        toast({
          title: "New items available",
          description: `${count} new item${count === 1 ? '' : 's'} available`,
          action: (
            <ToastAction altText="Refresh feeds" onClick={() => refreshFeeds()}>
              Refresh
            </ToastAction>
          ),
          duration: 10000, // 10 seconds
        })
      }
    }
    checkUpdates()

    const interval = setInterval(checkUpdates, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [mounted, checkForUpdates, refreshFeeds, toast])

  const columnWidth = 320
  const columnGutter = 24
  const columnCount = useMemo(() => 
    Math.max(1, Math.floor((width - 48) / (columnWidth + columnGutter))),
    [width]
  )
  
  const renderItem = useCallback(
    ({ data: feed }: { data: FeedItem }) => (
      <FeedCard feed={feed} />
    ),
    []
  )

  const memoizedItems = useMemo(() => items, [items])

  const itemKey = useCallback((item: FeedItem) => item.id, [])

  if (!mounted || !isMinLoadingComplete || isLoading) {
    return <LoadingAnimation />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Error loading feeds: {error}</p>
      </div>
    )
  }

  return (
    <div id="feed-grid" className="pt-6 h-screen">
      <Masonry
        items={memoizedItems}
        maxColumnCount={columnCount}
        columnGutter={columnGutter}
        columnWidth={columnWidth}
        render={renderItem}
        overscanBy={2}
        itemKey={itemKey}
      />
    </div>
  )
} 