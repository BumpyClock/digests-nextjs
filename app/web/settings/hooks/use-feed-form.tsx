"use client";

import { useCallback, type FormEvent } from "react"
import { useFeedStore } from "@/store/useFeedStore"
import { toast } from "sonner"
import { useState } from "react"

export function useFeedForm() {
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null)
  const { addFeed, loading } = useFeedStore()

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setFormElement(e.currentTarget)
      const formData = new FormData(e.currentTarget)
      const url = formData.get("feed-url") as string

      try {
        const result = await addFeed(url)

        if (result.success) {
          // Reset the form using the stored reference
          if (formElement) {
            formElement.reset()
          }
          toast.success("Feed added", {
            description: result.message,
            action: {
              label: "Refresh",
              onClick: () => close()
            },
            duration: 5000, // 5 seconds
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
    [addFeed, formElement]
  )

  // Expose a function to get a ref to the form element
  const registerForm = useCallback((element: HTMLFormElement | null) => {
    if (element) {
      setFormElement(element)
    }
  }, [])

  return { handleSubmit, registerForm, loading }
}