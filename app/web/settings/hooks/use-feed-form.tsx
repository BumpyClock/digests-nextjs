import { useCallback, useRef, type FormEvent } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { useToast } from "@/hooks/use-toast"
import { createToast } from "@/app/web/settings/utils/toast-utils"

export function useFeedForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()
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
          createToast(toast, {
            title: "Feed added",
            value: result.message,
          })
        } else {
          createToast(toast, {
            title: "Error",
            value: result.message,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error adding feed:", error)
        createToast(toast, {
          title: "Error",
          value: "Failed to add the feed. Please try again.",
          variant: "destructive",
        })
      }
    },
    [addFeed, toast]
  )

  return { handleSubmit, formRef, loading }
}