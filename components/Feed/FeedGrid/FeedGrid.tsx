"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { Masonry } from "masonic"
import { FeedCard } from "@/components/Feed/FeedCard/FeedCard"
import { useWindowSize } from "@/hooks/use-window-size"
import { useFeedStore } from "@/store/useFeedStore"
import { FeedItem } from "@/types"
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import loadingAnimation from "@/public/assets/animations/feed-loading.json"

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

/**
 * Loading animation component displayed while data is being fetched.
 */
const LoadingAnimation = () => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="w-64 h-64">
        {isMounted && <Lottie animationData={loadingAnimation} loop={true} />}
      </div>
    </div>
  )
}

/**
 * FeedGrid component that displays a grid of feed items.
 * 
 * @param {FeedGridProps} props - The properties for the FeedGrid component.
 * @returns {JSX.Element} The rendered FeedGrid component.
 */
export function FeedGrid({ items, isLoading }: FeedGridProps) {
  const { checkForUpdates, refreshFeeds } = useFeedStore()
  const [mounted, setMounted] = useState(false)
  const { width: windowWidth } = useWindowSize()
  const [isMinLoadingComplete, setIsMinLoadingComplete] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setIsMinLoadingComplete(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const checkUpdates = async () => {
      try {
        console.log("Checking for updates at time ", new Date().toLocaleString())
        const { hasNewItems, count } = await checkForUpdates()
        
        if (hasNewItems) {
          toast("New items available", {
            description: `${count} new item${count === 1 ? '' : 's'} available`,
            action: {
              label: "Refresh",
              onClick: () => refreshFeeds()
            },
            duration: 10000, // 10 seconds
          })
        } else {
          console.log("No updates available")
        }
      } catch (error) {
        console.error('Error checking for updates:', error)
      }
    }
    checkUpdates()

    const interval = setInterval(checkUpdates, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [mounted, checkForUpdates, refreshFeeds])

  const columnWidth = 320
  const columnGutter = 24
  const columnCount = useMemo(() => 
    Math.max(1, Math.floor((windowWidth - 48) / (columnWidth + columnGutter))),
    [windowWidth]
  )

  const renderItem = useCallback(
    ({ data: feed }: { data: FeedItem }) => <FeedCard feed={feed} />,
    []
  )

  const memoizedItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.warn('Items is not an array:', items)
      return []
    }
    return items.filter(item => item && item.id)
  }, [items])

  const cacheKey = useMemo(() => `masonry-${memoizedItems.length}`, [memoizedItems.length])

  const itemKey = useCallback((item: FeedItem, index: number) => {
    if (!item) {
      console.warn(`Undefined item at index ${index}`)
      return `fallback-${index}`
    }
    return item.id
  }, [])

  if (!mounted || !isMinLoadingComplete || isLoading || items.length === 0) {
    return <LoadingAnimation />
  }

  try {
    return (
      <div id="feed-grid" className="pt-6 h-screen">
        <Masonry
          key={cacheKey} 
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
  } catch (error) {
    console.error('Error rendering FeedGrid:', error)
    return <div>Error loading feed. Please try refreshing the page.</div>
  }
} 