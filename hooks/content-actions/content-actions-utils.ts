import { toast } from "sonner";

export type ContentType = "article" | "podcast";

interface ShareContentInput {
  url: string;
  title?: string;
  description?: string;
  contentType?: ContentType;
}

export async function handleShare({
  url,
  title,
  description,
  contentType = "article",
}: ShareContentInput): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: description,
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    toast("Share link copied", {
      description: `The link to this ${contentType} has been copied to your clipboard.`,
    });
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      toast.error("Error sharing", {
        description: `Failed to share the ${contentType}. Please try again.`,
      });
    }
  }
}

export function showReadLaterToast(
  wasInReadLater: boolean,
  contentType: ContentType = "article"
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
