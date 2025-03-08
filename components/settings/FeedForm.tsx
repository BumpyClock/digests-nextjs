"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FeedFormProps {
  onAddFeed: (url: string) => Promise<{ success: boolean; message: string }>
  isLoading: boolean
}

export function FeedForm({ onAddFeed, isLoading }: FeedFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const url = formData.get("feed-url") as string

    try {
      const result = await onAddFeed(url)

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

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="feed-url">Feed URL</Label>
        <Input id="feed-url" name="feed-url" placeholder="https://example.com/feed.xml" required />
      </div>
      <Button 
        type="submit" 
        disabled={isSubmitting || isLoading}
      >
        {(isSubmitting || isLoading) ? (
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
  )
}