import { useCallback, useRef, type FormEvent } from "react"
import { useAddFeedMutation } from "@/hooks/queries"
import { toast } from "sonner"
import { isYouTubeChannelUrl, getYouTubeRSSFeedUrl, resolveYouTubeChannelToRSS } from "@/utils/youtube"

export function useFeedForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const addFeedMutation = useAddFeedMutation()

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const inputUrl = formData.get("feed-url") as string

      if (!inputUrl) {
        toast.error("Please enter a feed URL")
        return
      }

      let finalUrl = inputUrl.trim()

      // Check if this is a YouTube channel URL and convert it to RSS feed URL
      if (isYouTubeChannelUrl(finalUrl)) {
        const rssUrl = getYouTubeRSSFeedUrl(finalUrl)
        
        if (rssUrl) {
          if (rssUrl.startsWith('youtube-resolve:')) {
            // Need to resolve the channel ID using our API
            toast.info("YouTube channel detected", {
              description: "Resolving channel ID...",
              duration: 3000,
            })
            
            try {
              const originalUrl = rssUrl.replace('youtube-resolve:', '')
              const resolvedRssUrl = await resolveYouTubeChannelToRSS(originalUrl)
              
              if (resolvedRssUrl) {
                finalUrl = resolvedRssUrl
                toast.success("Channel resolved", {
                  description: "Successfully found RSS feed for YouTube channel.",
                  duration: 2000,
                })
              } else {
                toast.error("Could not resolve YouTube channel", {
                  description: "Unable to find the channel ID. Please check the URL and try again.",
                })
                return
              }
            } catch (error) {
              console.error("Error resolving YouTube channel:", error)
              toast.error("Failed to resolve YouTube channel", {
                description: "There was an error looking up the channel. Please try again.",
              })
              return
            }
          } else {
            // Direct channel ID URL - already resolved
            finalUrl = rssUrl
            toast.info("YouTube channel detected", {
              description: "Converting to RSS feed format...",
              duration: 3000,
            })
          }
        } else {
          toast.error("Invalid YouTube URL", {
            description: "Please use: youtube.com/@username or youtube.com/channel/CHANNEL_ID",
          })
          return
        }
      }

      try {
        await addFeedMutation.mutateAsync(finalUrl)
        
        if (formRef.current) {
          formRef.current.reset()
        }
        
        const isYouTube = isYouTubeChannelUrl(inputUrl)
        toast.success(isYouTube ? "YouTube channel added successfully" : "Feed added successfully", {
          description: isYouTube 
            ? "The YouTube channel has been added to your subscriptions." 
            : "The feed has been added to your subscriptions.",
          duration: 5000,
        })
      } catch (error: unknown) {
        console.error("Error adding feed:", error)
        toast.error("Failed to add feed", {
          description: (error as Error)?.message || "Failed to add the feed. Please try again.",
        })
      }
    },
    [addFeedMutation]
  )

  return { 
    handleSubmit, 
    formRef, 
    loading: addFeedMutation.isPending 
  }
}