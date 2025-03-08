import type { ToastProps } from "@/components/ui/toast"

type ToastFunction = (props: ToastProps) => void

export function createToast(
  toast: ToastFunction,
  { 
    title, 
    value, 
    variant = "default" 
  }: { 
    title: string
    value: string
    variant?: "default" | "destructive"
  }
) {
  toast({
    title,
    value,
    variant,
  })
}

export const TOAST_MESSAGES = {
    FEED_ADDED: "Feed added",
    FEED_REMOVED: "Feed removed",
    URL_COPIED: "Feed URL copied",
    FEEDS_REFRESHED: "Feeds refreshed",
    ERROR: "Error",
    IMPORT_STARTED: "Processing OPML file",
    IMPORT_VALIDATING: "Validating feeds...",
    NO_NEW_FEEDS: "No new feeds found",
    PROCESSING_FEEDS: "Processing new feeds",
    IMPORT_COMPLETE: "Import complete",
    IMPORT_FAILED: "Import failed",
}