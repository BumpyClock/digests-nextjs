"use client";

import { useCallback, useState } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"
import { exportOPML } from "../utils/opml"

interface FeedItem {
  url: string
  title: string
  isSubscribed: boolean
}

export function useOPML() {
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const { feeds, addFeeds } = useFeedStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [detectedFeeds, setDetectedFeeds] = useState<FeedItem[]>([])

  // Register the file input element
  const registerFileInput = useCallback((element: HTMLInputElement | null) => {
    setFileInput(element)
  }, [])

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
      
      // Get unique feed URLs from OPML
      const existingUrls = new Set(feeds.map(f => f.feedUrl))
      const uniqueFeeds = new Map<string, FeedItem>()
      
      outlines.forEach(outline => {
        const feedUrl = outline.getAttribute('xmlUrl')
        const title = outline.getAttribute('title') || outline.getAttribute('text') || feedUrl || ''
        if (feedUrl) {
          uniqueFeeds.set(feedUrl, {
            url: feedUrl,
            title,
            isSubscribed: existingUrls.has(feedUrl)
          })
        }
      })

      const feedsList = Array.from(uniqueFeeds.values())
      
      if (feedsList.length === 0) {
        toast.error("No valid feeds found", {
          description: "The OPML file doesn't contain any valid feed URLs.",
        })
        return
      }

      setDetectedFeeds(feedsList)
      setIsDialogOpen(true)

    } catch (error) {
      console.error('Error importing OPML:', error)
      toast.error("Failed to import OPML file", {
        description: "Please check the file format and try again.",
      })
    }

    // Reset the file input
    if (fileInput) {
      fileInput.value = ''
    }
  }, [feeds, fileInput])

  const handleImportSelected = useCallback(async (selectedUrls: string[]) => {
    if (selectedUrls.length === 0) {
      toast.info("No feeds selected")
      return
    }

    const { successful, failed } = await addFeeds(selectedUrls)

    toast.success(`Import complete`, {
      description: `Added ${successful.length} new feeds. ${
        failed.length > 0 ? `${failed.length} feeds failed to import.` : ''
      }`,
    })

    setIsDialogOpen(false)
  }, [addFeeds])

  return {
    registerFileInput,
    handleExportOPML,
    handleImportOPML,
    isDialogOpen,
    setIsDialogOpen,
    detectedFeeds,
    handleImportSelected
  }
} 