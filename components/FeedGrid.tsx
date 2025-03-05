"use client"

import { useCallback, useState, useEffect } from "react"
import { Masonry } from "masonic"
import { FeedCard } from "@/components/feed-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWindowSize } from "@/hooks/use-window-size"
import { FeedItem } from "@/lib/rss"
import { Scrollbars } from "react-custom-scrollbars-2"

interface FeedGridProps {
  feeds: FeedItem[]
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
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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

export function FeedGrid({ feeds, isLoading, skeletonCount = 9 }: FeedGridProps) {
  const { width } = useWindowSize()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const columnWidth = 300
  const columnGutter = 24
  const columnCount = Math.max(1, Math.floor((width - 48) / (columnWidth + columnGutter)))
  
  const renderItem = useCallback(
    ({ data: feed, width }: { data: FeedItem; width: number }) => (
      <FeedCard feed={feed} />
    ),
    []
  )

  if (!mounted) {
    return <LoadingSkeleton columnCount={3} skeletonCount={skeletonCount} />
  }

  if (isLoading) {
    return <LoadingSkeleton columnCount={columnCount} skeletonCount={skeletonCount} />
  }

  return (
    <div className="h-full">
      <Scrollbars
        style={{ height: "100%" }}
        autoHide
        universal
        renderThumbVertical={({ style, ...props }) => (
          <div
            {...props}
            style={{
              ...style,
              backgroundColor: "var(--scrollbar-thumb)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          />
        )}
      >
        <div className="p-6">
          <Masonry
            items={feeds}
            columnGutter={columnGutter}
            columnWidth={columnWidth}
            render={renderItem}
            overscanBy={5}
            itemKey={(item) => item.id}
          />
        </div>
      </Scrollbars>
    </div>
  )
} 