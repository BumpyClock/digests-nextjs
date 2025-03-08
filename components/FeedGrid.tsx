"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { Masonry } from "masonic"
import { FeedCard } from "@/components/feed-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWindowSize } from "@/hooks/use-window-size"
import { FeedItem } from "@/types"

interface FeedGridProps {
  items: FeedItem[]
  isLoading: boolean
  skeletonCount?: number
  
}

const LoadingSkeleton = ({ columnCount = 3, skeletonCount = 9 }: { columnCount?: number, skeletonCount?: number }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div id="loading-skeleton" className="grid gap-6 grid-tem" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
        {Array(skeletonCount).fill(0).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="w-full" style={{ aspectRatio: "16/9" }} />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
      {Array(skeletonCount).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="w-full" style={{ aspectRatio: "16/9" }} />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FeedGrid({ items, isLoading, skeletonCount = 6 }: FeedGridProps) {
  const { width } = useWindowSize()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const columnWidth = 350
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

  if (!mounted) {
    return <LoadingSkeleton columnCount={3} skeletonCount={skeletonCount} />
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(skeletonCount).fill(0).map((_, i) => (
          <LoadingSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div id="feed-grid" className="p-2 pt-6 h-screen">
      <Masonry
        items={memoizedItems}
        maxColumnCount={columnCount}
        columnGutter={columnGutter}
        columnWidth={columnWidth}
        render={renderItem}
        overscanBy={1}
        itemKey={itemKey}
      />
    </div>
  )
} 