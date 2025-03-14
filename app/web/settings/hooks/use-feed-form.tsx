import { useCallback, useRef, type FormEvent } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"

export function useFeedForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { addFeed, loading } = useFeedStore()

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const url = formData.get("feed-url") as string

      try {
        const result = await addFeed(url)

        if (result.success) {
          if (formRef.current) {
            formRef.current.reset()
          }
          toast.success("Feed added", {
            description: result.message,
            action: {
              label: "Refresh",
              onClick: () => close()
            },
            duration: 10000, // 10 seconds
          })
          
        } else {
          toast.warning("Failed to add feed", {
            description: result.message,
          })
        }
      } catch (error) {
        console.error("Error adding feed:", error)
        toast.error("Failed to add feed", {
          description: "Failed to add the feed. Please try again.",
        })
      }
    },
    [addFeed]
  )

  return { handleSubmit, formRef, loading }
}