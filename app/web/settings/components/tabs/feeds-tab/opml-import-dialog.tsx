import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { workerService } from "@/services/worker-service"
import type { Feed } from "@/types"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

interface FeedItem {
  url: string
  title: string
  isSubscribed: boolean
  error?: string
  feed?: Feed
}

interface OPMLImportDialogProps {
  feeds: FeedItem[]
  onImport: (selectedUrls: string[]) => void
  onCancel: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FeedIcon({ feed, error }: { feed?: Feed; error?: string }) {
  if (error) {
    return (
      <div className="w-10 h-10 flex items-center justify-center bg-destructive/10 rounded-sm">
        <AlertCircle className="w-5 h-5 text-destructive" />
      </div>
    )
  }

  if (feed?.favicon) {
    return (
      <Image
        src={feed.favicon}
        alt=""
        width={40}
        height={40}
        className="rounded-sm"
      />
    )
  }

  return <div className="w-10 h-10 bg-muted rounded-sm" />
}

export function OPMLImportDialog({
  feeds: initialFeeds,
  onImport,
  onCancel,
  open,
  onOpenChange,
}: OPMLImportDialogProps) {
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set())
  const [feeds, setFeeds] = useState<FeedItem[]>(initialFeeds)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeedDetails = async () => {
      setLoading(true)
      const updatedFeeds = await Promise.all(
        initialFeeds.map(async (feed) => {
          try {
            const result = await workerService.fetchFeeds(feed.url)
            if (result.success && result.feeds.length > 0) {
              const feedData = result.feeds[0]
              return { 
                ...feed, 
                feed: feedData,
                title: feedData.feedTitle || feedData.siteTitle || feed.title || feed.url
              }
            } else {
              return { ...feed, error: result.message || "Failed to fetch feed" }
            }
          } catch (error) {
            console.log(error)
            return { ...feed, error: "Failed to fetch feed" }
          }
        })
      )
      setFeeds(updatedFeeds)
      setLoading(false)
    }

    if (open) {
      fetchFeedDetails()
    }
  }, [initialFeeds, open])

  const handleSelectAll = () => {
    const newSelected = new Set<string>()
    feeds.forEach(feed => {
      if (!feed.isSubscribed && !feed.error) {
        newSelected.add(feed.url)
      }
    })
    setSelectedFeeds(newSelected)
  }

  const handleToggleFeed = (url: string) => {
    const newSelected = new Set(selectedFeeds)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
    }
    setSelectedFeeds(newSelected)
  }

  const handleImport = () => {
    onImport(Array.from(selectedFeeds))
    setSelectedFeeds(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col" id="opml-import-dialog">
        <DialogHeader>
          <DialogTitle>Select Feeds to Import</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <Label>Found {feeds.length} feeds</Label>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={loading}>
              Select All
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {loading ? (
              Array.from({ length: initialFeeds.length }).map((_, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 rounded-lg">
                  <Skeleton className="h-5 w-5 mt-1" />
                  <Skeleton className="h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              feeds.map((feed) => (
                <div
                  key={feed.url}
                  className="flex items-start space-x-2 p-2 rounded-lg hover:bg-accent"
                >
                  <Checkbox
                    id={feed.url}
                    checked={selectedFeeds.has(feed.url)}
                    onCheckedChange={() => handleToggleFeed(feed.url)}
                    disabled={feed.isSubscribed || !!feed.error}
                    className="mt-1"
                  />
                  <FeedIcon feed={feed.feed} error={feed.error} />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={feed.url}
                      className="flex flex-col space-y-1"
                    >
                      <span className="font-medium truncate">
                        {feed.title}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {feed.url}
                      </span>
                    </Label>
                    {feed.error && (
                      <Alert variant="destructive" className="mt-1 py-1">
                        <AlertDescription className="text-xs">
                          {feed.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    {feed.isSubscribed && (
                      <Badge variant="secondary" className="mt-1">
                        Already Added
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleImport} className="flex-1" disabled={loading}>
            Import Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 