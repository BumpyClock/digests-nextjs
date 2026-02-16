import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useBatchAddFeedsMutation } from "@/hooks/queries";
import { useSubscriptions } from "@/hooks/useFeedSelectors";
import { isFeedUrl } from "@/utils/url";
import { exportOPML } from "../utils/opml";

interface FeedItem {
  url: string;
  title: string;
  isSubscribed: boolean;
}

export function useOPML() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feeds = useSubscriptions();
  const batchAddFeedsMutation = useBatchAddFeedsMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detectedFeeds, setDetectedFeeds] = useState<FeedItem[]>([]);

  const handleExportOPML = useCallback(() => {
    exportOPML(feeds);
  }, [feeds]);

  const handleImportOPML = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      try {
        toast.info("Importing OPML...", {
          description: "Validating OPML file...",
        });

        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const parserError = doc.querySelector("parsererror");
        if (parserError) {
          const parserErrorMessage = parserError.textContent?.trim() || "Invalid OPML XML format";
          throw new Error(parserErrorMessage);
        }
        const outlines = doc.querySelectorAll("outline");

        // Get unique feed URLs from OPML
        const existingUrls = new Set(feeds.map((f: { feedUrl: string }) => f.feedUrl));
        const uniqueFeeds = new Map<string, FeedItem>();

        outlines.forEach((outline) => {
          const feedUrl = outline.getAttribute("xmlUrl");
          const title =
            outline.getAttribute("title") || outline.getAttribute("text") || feedUrl || "";
          if (isFeedUrl(feedUrl)) {
            uniqueFeeds.set(feedUrl, {
              url: feedUrl.trim(),
              title,
              isSubscribed: existingUrls.has(feedUrl),
            });
          }
        });

        const feedsList = Array.from(uniqueFeeds.values());

        if (feedsList.length === 0) {
          toast.error("No valid feeds found", {
            description: "The OPML file doesn't contain any valid feed URLs.",
          });
          return;
        }

        setDetectedFeeds(feedsList);
        setIsDialogOpen(true);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error importing OPML:", error);
        toast.error("Failed to import OPML file", {
          description: errorMessage || "Please check the file format and try again.",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [feeds]
  );

  const handleImportSelected = useCallback(
    async (selectedUrls: string[]) => {
      const normalizedUrls = Array.from(new Set(selectedUrls.map((url) => url.trim()))).filter(
        isFeedUrl
      );

      if (normalizedUrls.length === 0) {
        toast.info("No feeds selected");
        return;
      }

      if (normalizedUrls.length !== selectedUrls.length) {
        toast.warning("Some selected feeds were invalid and skipped");
      }

      try {
        const result = await batchAddFeedsMutation.mutateAsync(normalizedUrls);

        toast.success(`Import complete`, {
          description: `Added ${result.successfulCount} new feeds. ${
            result.failedCount > 0 ? `${result.failedCount} feeds failed to import.` : ""
          }`,
        });

        setIsDialogOpen(false);
      } catch (error) {
        console.error("Error during batch import:", error);
        toast.error("Import failed", {
          description: "An error occurred while importing feeds. Please try again.",
        });
      }
    },
    [batchAddFeedsMutation]
  );

  return {
    fileInputRef,
    handleExportOPML,
    handleImportOPML,
    isDialogOpen,
    setIsDialogOpen,
    detectedFeeds,
    handleImportSelected,
  };
}
