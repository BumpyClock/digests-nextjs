import { useCallback, useRef } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { useToast } from "@/hooks/use-toast"
import { createToast, TOAST_MESSAGES } from "../utils/toast-utils"
import { exportOPML } from "../utils/opml"

export function useOPML() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { feeds, addFeeds } = useFeedStore()
  const { toast } = useToast()

  const handleExportOPML = useCallback(() => {
    exportOPML(feeds)
  }, [feeds])

  const handleImportOPML = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      createToast(toast, {
        title: TOAST_MESSAGES.IMPORT_STARTED,
        value: TOAST_MESSAGES.IMPORT_VALIDATING,
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
        createToast(toast, {
          title: TOAST_MESSAGES.NO_NEW_FEEDS,
          value: existingUrls.size > 0 
            ? "All feeds in the OPML file are already in your subscriptions."
            : "The OPML file doesn't contain any valid feed URLs.",
          variant: "destructive",
        })
        return
      }

      createToast(toast, {
        title: TOAST_MESSAGES.PROCESSING_FEEDS,
        value: `Found ${newFeedUrls.length} new feeds to import...`,
      })

      // Use the batch method
      const { successful, failed } = await addFeeds(newFeedUrls)
      const skipped = outlines.length - newFeedUrls.length

      createToast(toast, {
        title: TOAST_MESSAGES.IMPORT_COMPLETE,
        value: `Added ${successful.length} new feeds. ${
          failed.length > 0 ? `${failed.length} feeds failed to import. ` : ''
        }${
          skipped > 0 ? `${skipped} feeds were already in your subscriptions.` : ''
        }`,
        variant: failed.length > 0 ? "destructive" : "default",
      })

    } catch (error) {
      console.error('Error importing OPML:', error)
      createToast(toast, {
        title: TOAST_MESSAGES.IMPORT_FAILED,
        value: "Failed to import OPML file. Please check the file format and try again.",
        variant: "destructive",
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [feeds, addFeeds, toast])

  return {
    fileInputRef,
    handleExportOPML,
    handleImportOPML
  }
} 