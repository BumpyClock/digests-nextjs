import { useCallback, useRef } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"
import { exportOPML } from "../utils/opml"

export function useOPML() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { feeds, addFeeds } = useFeedStore()

  const handleExportOPML = useCallback(() => {
    exportOPML(feeds)
  }, [feeds])

  const handleImportOPML = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast.info("Importing OPML...", {
        description: "Validating OPML file...",
      })

      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      const outlines = doc.querySelectorAll('outline')
      
      // Get unique feed URLs from OPML, excluding ones we're already subscribed to
      const existingUrls = new Set(feeds.map(f => f.feedUrl))
      const newFeedUrls: string[] = []
      
      outlines.forEach(outline => {
        const feedUrl = outline.getAttribute('xmlUrl')
        if (feedUrl && !existingUrls.has(feedUrl)) {
          newFeedUrls.push(feedUrl)
        }
      })

      if (newFeedUrls.length === 0) {
        toast.info("No new feeds to import", {
          description: existingUrls.size > 0 
            ? "All feeds in the OPML file are already in your subscriptions."
            : "The OPML file doesn't contain any valid feed URLs.",
        })
        return
      }

      toast.info(`Found ${newFeedUrls.length} new feeds to import...`, {
        description: `Processing ${newFeedUrls.length} new feeds...`,
      })

      // Use the batch method
      const { successful, failed } = await addFeeds(newFeedUrls)
      const skipped = outlines.length - newFeedUrls.length

      toast.success(`Import complete`, {
        description: `Added ${successful.length} new feeds. ${
          failed.length > 0 ? `${failed.length} feeds failed to import. ` : ''
        }${
          skipped > 0 ? `${skipped} feeds were already in your subscriptions.` : ''
        }`,
      })

    } catch (error) {
      console.error('Error importing OPML:', error)
      toast.error("Failed to import OPML file", {
        description: "Please check the file format and try again.",
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [feeds, addFeeds])

  return {
    fileInputRef,
    handleExportOPML,
    handleImportOPML
  }
} 