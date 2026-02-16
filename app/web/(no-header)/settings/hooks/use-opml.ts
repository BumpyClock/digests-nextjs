// ABOUTME: React hook for OPML import/export orchestration.
// ABOUTME: Delegates parsing and URL deduplication to ../utils/opml.

import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useBatchAddFeedsMutation } from "@/hooks/queries";
import { useSubscriptions } from "@/hooks/useFeedSelectors";
import {
  type OPMLFeedItem,
  deduplicateUrls,
  exportOPML,
  parseFeedsFromDocument,
} from "../utils/opml";

export function useOPML() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feeds = useSubscriptions();
  const batchAddFeedsMutation = useBatchAddFeedsMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detectedFeeds, setDetectedFeeds] = useState<OPMLFeedItem[]>([]);

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
        const existingUrls = new Set(feeds.map((f: { feedUrl: string }) => f.feedUrl.trim()));
        const feedsList = parseFeedsFromDocument(doc, existingUrls);

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
      const { urls: normalizedUrls, invalidCount, duplicateCount } = deduplicateUrls(selectedUrls);

      if (invalidCount > 0 || duplicateCount > 0) {
        const messages: string[] = [];

        if (invalidCount > 0) {
          messages.push(`${invalidCount} invalid feed${invalidCount === 1 ? "" : "s"} skipped`);
        }

        if (duplicateCount > 0) {
          messages.push(
            `${duplicateCount} duplicate feed${duplicateCount === 1 ? "" : "s"} removed`
          );
        }

        toast.warning(messages.join(" and "));
      }

      if (normalizedUrls.length === 0) {
        toast.info("No valid feeds selected");
        return;
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
