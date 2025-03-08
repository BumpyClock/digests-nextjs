"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, RefreshCw, ExternalLink, Download, Upload, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { Feed } from "@/lib/rss"
import Image from "next/image"
import { useFeedStore } from "@/store/useFeedStore"
import { getFeeds } from "@/lib/clientStorage"
import { fetchFeedsAction } from "@/app/actions"
import { SettingsFeedGrid } from "./settingsFeedGrid"

function exportOPML(feeds: Feed[]) {
  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Digests Feed Subscriptions</title>
  </head>
  <body>
    ${feeds.map(feed => `
    <outline 
      type="${feed.type || 'rss'}"
      text="${feed.feedTitle || ''}"
      title="${feed.feedTitle || ''}"
      xmlUrl="${feed.feedUrl}"
      htmlUrl="${feed.feedUrl || ''}"
    />`).join('')}
  </body>
</opml>`

  const blob = new Blob([opml], { type: 'text/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'digests-subscriptions.opml'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Add this type for feed validation results
type FeedValidationResult = {
  feedUrl: string
  isValid: boolean
  feed?: Feed
  error?: string
}

// Modify the helper function to validate feeds first
async function validateFeeds(
  feedUrls: string[],
  batchSize: number = 5
): Promise<FeedValidationResult[]> {
  const results: FeedValidationResult[] = []

  for (let i = 0; i < feedUrls.length; i += batchSize) {
    const batch = feedUrls.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(async (feedUrl): Promise<FeedValidationResult> => {
        try {
          const result = await fetchFeedsAction(feedUrl)
          if (result.success && result.feeds?.[0]) {
            // Just pass through the Feed object, items will be fetched later
            return {
              feedUrl,
              isValid: true,
              feed: result.feeds[0]
            }
          }
          return {
            feedUrl,
            isValid: false,
            error: result.message
          }
        } catch (error) {
          return {
            feedUrl,
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    results.push(...batchResults)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}

export default function SettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use all required store actions
  const { 
    feeds, 
    addFeed, 
    removeFeed, 
    refreshFeeds,
    loading,
    refreshing,
    addFeeds
  } = useFeedStore()

  async function handleAddFeed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const url = formData.get("feed-url") as string

    try {
      const result = await addFeed(url)

      if (result.success) {
        if (formRef.current) {
          formRef.current.reset()
        }

        toast({
          title: "Feed added",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding feed:", error)
      toast({
        title: "Error",
        description: "Failed to add the feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveFeed(feedUrl: string) {
    removeFeed(feedUrl)
    toast({
      title: "Feed removed",
      description: "The feed has been removed from your subscriptions.",
    })
  }

  const handleImportOPML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast({
        title: "Processing OPML file",
        description: "Validating feeds...",
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
        toast({
          title: "No new feeds found",
          description: existingUrls.size > 0 
            ? "All feeds in the OPML file are already in your subscriptions."
            : "The OPML file doesn't contain any valid feed URLs.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Processing new feeds",
        description: `Found ${newFeedUrls.length} new feeds to import...`,
      })

      // Use the new batch method instead of Promise.all
      const { successful, failed } = await addFeeds(newFeedUrls)
      const skipped = outlines.length - newFeedUrls.length

      toast({
        title: "Import complete",
        description: `Added ${successful.length} new feeds. ${
          failed.length > 0 ? `${failed.length} feeds failed to import. ` : ''
        }${
          skipped > 0 ? `${skipped} feeds were already in your subscriptions.` : ''
        }`,
        variant: failed.length > 0 ? "destructive" : "default",
      })

    } catch (error) {
      console.error('Error importing OPML:', error)
      toast({
        title: "Import failed",
        description: "Failed to import OPML file. Please check the file format and try again.",
        variant: "destructive",
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Update the refresh button to use store's refreshFeeds
  const handleRefresh = async () => {
    try {
      await refreshFeeds()
      toast({
        title: "Feeds refreshed",
        description: "All your feeds have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyFeed = (feedUrl: string) => {
    navigator.clipboard.writeText(feedUrl)
    toast({
      title: "Feed URL copied",
      description: "The feed URL has been copied to your clipboard.",
    })
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] ">
      <div className="container py-6 max-w-7xl h-full">
        <div className="flex flex-col space-y-6 h-full">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your feeds and application preferences</p>
          </div>

          <Tabs defaultValue="feeds" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="feeds">Feeds</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <div className="flex-1 ">
              <TabsContent value="feeds" className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Feed</CardTitle>
                    <CardDescription>
                      Enter the URL of an RSS feed or podcast to add it to your subscriptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form ref={formRef} onSubmit={handleAddFeed} className="flex items-end gap-2">
                      <div className="grid w-full gap-1.5">
                        <Label htmlFor="feed-url">Feed URL</Label>
                        <Input id="feed-url" name="feed-url" placeholder="https://example.com/feed.xml" required />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting || loading}
                      >
                        {(isSubmitting || loading) ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Feed
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="flex justify-between items-center mt-8 mb-4">
                  <h2 className="text-xl font-bold">Your Subscriptions</h2>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      title="Import OPML"
                      accept=".opml,.xml"
                      onChange={handleImportOPML}
                      ref={fileInputRef}
                      className="hidden"
                      id="opml-import"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import OPML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportOPML(feeds)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export OPML
                    </Button>
                  </div>
                </div>

                {feeds.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground mb-4">You haven't added any feeds yet.</p>
                      <Button onClick={() => document.getElementById("feed-url")?.focus()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Feed
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <SettingsFeedGrid
                    feeds={feeds.map(feed => feed)}
                    onDelete={handleRemoveFeed}
                    onCopy={handleCopyFeed}
                  />
                )}
              </TabsContent>

              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how Digests looks and feels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                      </div>
                      <Switch id="dark-mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="compact-view">Compact View</Label>
                        <p className="text-sm text-muted-foreground">Display more items in a condensed layout</p>
                      </div>
                      <Switch id="compact-view" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="font-size">Font Size</Label>
                        <p className="text-sm text-muted-foreground">Adjust the text size for better readability</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          A-
                        </Button>
                        <Button variant="outline" size="sm">
                          A+
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account and subscription</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" value="user@example.com" readOnly />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">Display Name</Label>
                      <Input id="name" placeholder="Your Name" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Change Password</Button>
                    <Button>Save Changes</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

