import { toast } from "sonner";

/**
 * Shared utility for handling share actions across the application
 * Provides consistent share behavior and toast messaging
 *
 * @param url - The URL to share
 * @param title - Optional title for the share dialog
 * @param description - Optional description/text for the share dialog
 * @param contentType - Type of content being shared (for toast messages)
 */
export async function handleShare(
  url: string,
  title?: string,
  description?: string,
  contentType: "article" | "podcast" = "article"
): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({
        title: title,
        text: description,
        url: url,
      });
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast("Share link copied", {
        description: `The link to this ${contentType} has been copied to your clipboard.`,
      });
    }
  } catch (error) {
    // Only show error if it's not an AbortError (user cancelled share)
    if (error instanceof Error && error.name !== "AbortError") {
      toast.error("Error sharing", {
        description: `Failed to share the ${contentType}. Please try again.`,
      });
    }
  }
}

/**
 * Shared utility for handling read later toggle actions
 * Provides consistent toast messaging
 *
 * @param wasInReadLater - The read later state BEFORE the toggle (true = was in list, false = was not in list)
 * @param contentType - Type of content being saved (for toast messages)
 */
export function showReadLaterToast(
  wasInReadLater: boolean,
  contentType: "article" | "podcast" = "article"
): void {
  if (wasInReadLater) {
    toast("Removed from Read Later", {
      description: `The ${contentType} has been removed from your reading list.`,
    });
  } else {
    toast("Added to Read Later", {
      description: `The ${contentType} has been added to your reading list.`,
    });
  }
}
