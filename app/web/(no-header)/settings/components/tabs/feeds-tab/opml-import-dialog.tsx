"use client";

import { AlertCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { workerService } from "@/services/worker-service";
import type { FeedItem as ApiFeedItem, Feed } from "@/types";
import { getSiteDisplayName } from "@/utils/htmlUtils";
import { isValidUrl } from "@/utils/url";

interface FeedItem {
  url: string;
  title: string;
  isSubscribed: boolean;
  error?: string;
  feed?: Feed;
}

const isFeedUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  const normalized = url.trim();
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  return isValidUrl(normalized);
};

interface OPMLImportDialogProps {
  feeds: FeedItem[];
  onImport: (selectedUrls: string[]) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FeedIcon({ feed, error }: { feed?: Feed; error?: string }) {
  if (error) {
    return (
      <div className="w-10 h-10 flex items-center justify-center bg-destructive/10 rounded-sm">
        <AlertCircle className="w-5 h-5 text-destructive" />
      </div>
    );
  }

  if (feed?.favicon) {
    return <Image src={feed.favicon} alt="" width={40} height={40} className="rounded-sm" />;
  }

  return <div className="w-10 h-10 bg-muted rounded-sm" />;
}

export function OPMLImportDialog({
  feeds: initialFeeds,
  onImport,
  onCancel,
  open,
  onOpenChange,
}: OPMLImportDialogProps) {
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [feeds, setFeeds] = useState<FeedItem[]>(initialFeeds);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFeeds(initialFeeds);
    setSelectedFeeds(new Set());
  }, [initialFeeds]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const fetchFeedDetails = async () => {
      setLoading(true);
      try {
        // Get all feed URLs
        const feedUrls = initialFeeds.map((feed) => feed.url.trim()).filter(isFeedUrl);
        const feedErrors = new Set(
          initialFeeds.filter((feed) => !isFeedUrl(feed.url)).map((feed) => feed.url)
        );

        if (feedErrors.size > 0) {
          setFeeds((prev) =>
            prev.map((feed) =>
              isFeedUrl(feed.url)
                ? feed
                : {
                    ...feed,
                    error: "Invalid feed URL. Skipped during validation.",
                  }
            )
          );
        }

        if (feedUrls.length === 0) {
          setLoading(false);
          return;
        }

        // Initialize worker if not already
        workerService.initialize();

        // Create a promise that resolves when we get the FEEDS_RESULT
        const result = await new Promise<{
          success: boolean;
          feeds: Feed[];
          items: ApiFeedItem[];
          message?: string;
        }>((resolve) => {
          // Register one-time handler for response
          unsubscribe = workerService.onMessage("FEEDS_RESULT", (response) => {
            unsubscribe?.();
            unsubscribe = undefined;
            resolve(response);
          });

          // Send message to worker
          workerService.postMessage({
            type: "FETCH_FEEDS",
            payload: { urls: feedUrls },
          });
        });

        if (!isMounted) {
          return;
        }

        if (result.success) {
          // Map the fetched feeds back to our feed items
          const updatedFeeds = initialFeeds.map((feed) => {
            const fetchedFeed = result.feeds.find((f) => f.feedUrl === feed.url);
            if (fetchedFeed) {
              return {
                ...feed,
                feed: fetchedFeed,
                title: getSiteDisplayName(fetchedFeed, {
                  extraFallbacks: [fetchedFeed.feedTitle, feed.title, feed.url],
                }),
              };
            }
            return { ...feed, error: "Feed not found in response" };
          });
          setFeeds(updatedFeeds);
        } else {
          // If the entire request failed, mark all feeds as errored
          const updatedFeeds = initialFeeds.map((feed) => ({
            ...feed,
            error: result.message || "Failed to fetch feeds",
          }));
          setFeeds(updatedFeeds);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching feeds:", { error, errorMessage });
        if (!isMounted) {
          return;
        }

        // If there's an error, mark all feeds as errored
        const updatedFeeds = initialFeeds.map((feed) => ({
          ...feed,
          error: `Failed to fetch feeds: ${errorMessage}`,
        }));
        setFeeds(updatedFeeds);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (open) {
      fetchFeedDetails();
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
      unsubscribe = undefined;
    };
  }, [initialFeeds, open]);

  const handleSelectAll = () => {
    const newSelected = new Set<string>();
    feeds.forEach((feed) => {
      if (!feed.isSubscribed && !feed.error) {
        newSelected.add(feed.url);
      }
    });
    setSelectedFeeds(newSelected);
  };

  const handleToggleFeed = (url: string) => {
    const newSelected = new Set(selectedFeeds);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedFeeds(newSelected);
  };

  const handleImport = () => {
    onImport(Array.from(selectedFeeds));
    setSelectedFeeds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col"
        id="opml-import-dialog"
      >
        <DialogHeader>
          <DialogTitle>Select Feeds to Import</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <Label>Found {feeds.length} feeds</Label>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={loading}>
              Select All
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {loading
              ? initialFeeds.map((feed) => (
                  <div key={feed.url} className="flex items-start space-x-2 p-2 rounded-lg">
                    <Skeleton className="h-5 w-5 mt-1" />
                    <Skeleton className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : feeds.map((feed) => (
                  <div
                    key={feed.url}
                    className="flex items-start space-x-2 p-2 rounded-lg hover:bg-accent"
                  >
                    <Checkbox
                      id={feed.url}
                      checked={selectedFeeds.has(feed.url)}
                      onCheckedChange={() => handleToggleFeed(feed.url)}
                      disabled={feed.isSubscribed || !!feed.error}
                      className="mt-1"
                    />
                    <FeedIcon feed={feed.feed} error={feed.error} />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={feed.url} className="flex flex-col space-y-1">
                        <span className="text-subtitle text-primary-content truncate">
                          {feed.title}
                        </span>
                        <span className="text-body-small text-secondary-content truncate">
                          {feed.url}
                        </span>
                      </Label>
                      {feed.error && (
                        <Alert variant="destructive" className="mt-1 py-1">
                          <AlertDescription className="text-caption">{feed.error}</AlertDescription>
                        </Alert>
                      )}
                      {feed.isSubscribed && (
                        <Badge variant="secondary" className="mt-1">
                          Already Added
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        </div>
        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="flex-1"
            disabled={loading || selectedFeeds.size === 0}
          >
            Import Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
