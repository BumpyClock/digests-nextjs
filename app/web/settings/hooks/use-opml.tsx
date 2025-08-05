import { useCallback, useRef, useState } from "react";
import { useFeedsQuery, useBatchAddFeedsMutation } from "@/hooks/queries";
import { toast } from "sonner";
import { exportOPML } from "../utils/opml";

interface FeedItem {
  url: string;
  title: string;
  isSubscribed: boolean;
}

export function useOPML() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedsQuery = useFeedsQuery();
  const feedsFromQuery = feedsQuery.data?.feeds || [];
  const feeds = useMemo(() => feedsFromQuery, [feedsFromQuery]);
  const batchAddFeedsMutation = useBatchAddFeedsMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detectedFeeds, setDetectedFeeds] = useState<FeedItem[]>([]);

  const handleExportOPML = useCallback(() => {
    exportOPML(feeds);
  }, [feeds]);

  const handleImportOPML = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        toast.info("Importing OPML...", {
          description: "Validating OPML file...",
        });

        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const outlines = doc.querySelectorAll("outline");

        // Get unique feed URLs from OPML
        const existingUrls = new Set(feeds.map((f) => f.feedUrl));
        const uniqueFeeds = new Map<string, FeedItem>();

        outlines.forEach((outline) => {
          const feedUrl = outline.getAttribute("xmlUrl");
          const title =
            outline.getAttribute("title") ||
            outline.getAttribute("text") ||
            feedUrl ||
            "";
          if (feedUrl) {
            uniqueFeeds.set(feedUrl, {
              url: feedUrl,
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
      } catch (error) {
        console.error("Error importing OPML:", error);
        toast.error("Failed to import OPML file", {
          description: "Please check the file format and try again.",
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [feeds],
  );

  const handleImportSelected = useCallback(
    async (selectedUrls: string[]) => {
      if (selectedUrls.length === 0) {
        toast.info("No feeds selected");
        return;
      }

      try {
        const result = await batchAddFeedsMutation.mutateAsync(selectedUrls);

        toast.success(`Import complete`, {
          description: `Added ${result.successfulCount} new feeds. ${
            result.failedCount > 0
              ? `${result.failedCount} feeds failed to import.`
              : ""
          }`,
        });

        setIsDialogOpen(false);
      } catch (error) {
        console.error("Error during batch import:", error);
        toast.error("Import failed", {
          description:
            "An error occurred while importing feeds. Please try again.",
        });
      }
    },
    [batchAddFeedsMutation],
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
