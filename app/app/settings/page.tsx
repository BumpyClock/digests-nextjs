"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, RefreshCw, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { Feed } from "@/lib/rss"
import Image from "next/image"
import { useFeedManagement } from "@/hooks/use-feed-management"
import { getFeeds } from "@/lib/clientStorage"

export default function SettingsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const { addFeed } = useFeedManagement()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    async function loadFeeds() {
      setIsLoading(true)
      const loadedFeeds = getFeeds()
      setFeeds(loadedFeeds)
      setIsLoading(false)
    }

    loadFeeds()
  }, [])

  async function handleAddFeed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const url = formData.get("feed-url") as string

    try {
      await addFeed(url)

      // Refresh feeds list
      const loadedFeeds = getFeeds()
      setFeeds(loadedFeeds)

      // Clear the form
      if (formRef.current) {
        formRef.current.reset()
      }

      toast({
        title: "Feed added",
        description: "The feed has been successfully added to your subscriptions.",
      })
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
    const updatedFeeds = feeds.filter((feed) => feed.feedUrl !== feedUrl)
    setFeeds(updatedFeeds)
    // Update local storage
    localStorage.setItem("rss_reader_feeds", JSON.stringify(updatedFeeds))

    toast({
      title: "Feed removed",
      description: "The feed has been removed from your subscriptions.",
    })
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="container py-6 max-w-4xl h-full">
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

            <div className="flex-1 overflow-auto">
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
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
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

                <h2 className="text-xl font-bold mt-8 mb-4">Your Subscriptions</h2>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-md bg-muted animate-pulse" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : feeds.length === 0 ? (
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
                  <div className="space-y-4">
                    {feeds.map((feed) => (
                      <Card key={feed.feedUrl}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                {feed.favicon ? (
                                  <Image
                                    src={feed.favicon || "/placeholder.svg"}
                                    alt={`${feed.feedTitle} favicon`}
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                  />
                                ) : (
                                  feed.feedTitle && feed.feedTitle.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium">{feed.feedTitle}</h3>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                                  {feed.feedUrl}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="icon" asChild>
                                <a href={feed.feedUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="sr-only">Open original</span>
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveFeed(feed.feedUrl)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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

