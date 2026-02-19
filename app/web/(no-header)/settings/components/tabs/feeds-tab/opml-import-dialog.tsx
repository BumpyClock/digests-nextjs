"use client";

import { AlertCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useReducer } from "react";
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
import { isHttpUrl } from "@/utils/url";

interface FeedItem {
  url: string;
  title: string;
  isSubscribed: boolean;
  error?: string;
  feed?: Feed;
}

interface OPMLImportDialogProps {
  feeds: FeedItem[];
  onImport: (selectedUrls: string[]) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OPMLImportState {
  selectedFeeds: Set<string>;
  feeds: FeedItem[];
  loading: boolean;
}

type OPMLImportAction =
  | { type: "sync_initial_feeds"; feeds: FeedItem[] }
  | { type: "set_loading"; loading: boolean }
  | { type: "mark_invalid_urls" }
  | { type: "set_feeds"; feeds: FeedItem[] }
  | { type: "select_all_available" }
  | { type: "toggle_feed_selection"; url: string }
  | { type: "clear_selection" };

function createInitialState(feeds: FeedItem[]): OPMLImportState {
  return {
    selectedFeeds: new Set(),
    feeds,
    loading: true,
  };
}

function opmlImportReducer(state: OPMLImportState, action: OPMLImportAction): OPMLImportState {
  switch (action.type) {
    case "sync_initial_feeds":
      return {
        ...state,
        feeds: action.feeds,
        selectedFeeds: new Set(),
      };
    case "set_loading":
      return {
        ...state,
        loading: action.loading,
      };
    case "mark_invalid_urls":
      return {
        ...state,
        feeds: state.feeds.map((feed) =>
          isHttpUrl(feed.url.trim())
            ? feed
            : {
                ...feed,
                error: "Invalid feed URL. Skipped during validation.",
              }
        ),
      };
    case "set_feeds":
      return {
        ...state,
        feeds: action.feeds,
      };
    case "select_all_available":
      return {
        ...state,
        selectedFeeds: new Set(
          state.feeds.filter((feed) => !feed.isSubscribed && !feed.error).map((feed) => feed.url)
        ),
      };
    case "toggle_feed_selection": {
      const nextSelectedFeeds = new Set(state.selectedFeeds);
      if (nextSelectedFeeds.has(action.url)) {
        nextSelectedFeeds.delete(action.url);
      } else {
        nextSelectedFeeds.add(action.url);
      }
      return {
        ...state,
        selectedFeeds: nextSelectedFeeds,
      };
    }
    case "clear_selection":
      return {
        ...state,
        selectedFeeds: new Set(),
      };
    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(opmlImportReducer, initialFeeds, createInitialState);
  const { selectedFeeds, feeds, loading } = state;

  useEffect(() => {
    dispatch({ type: "sync_initial_feeds", feeds: initialFeeds });
  }, [initialFeeds]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;
    const finishLoading = () => {
      if (isMounted) {
        dispatch({ type: "set_loading", loading: false });
      }
    };

    const fetchFeedDetails = async () => {
      dispatch({ type: "set_loading", loading: true });
      const runResult = await (async () => {
        // Partition feed URLs into valid and invalid in a single pass
        const feedUrls: string[] = [];
        const feedErrors = new Set<string>();
        for (const feed of initialFeeds) {
          const trimmed = feed.url.trim();
          if (isHttpUrl(trimmed)) {
            feedUrls.push(trimmed);
          } else {
            feedErrors.add(trimmed);
          }
        }

        if (feedErrors.size > 0) {
          dispatch({ type: "mark_invalid_urls" });
        }

        if (feedUrls.length === 0) {
          return null;
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
          return null;
        }

        if (result.success) {
          // Map the fetched feeds back to our feed items
          const updatedFeeds = initialFeeds.map((feed) => {
            const trimmedUrl = feed.url.trim();
            const fetchedFeed = result.feeds.find((f) => f.feedUrl === trimmedUrl);
            if (fetchedFeed) {
              return {
                ...feed,
                feed: fetchedFeed,
                title: getSiteDisplayName(fetchedFeed, {
                  extraFallbacks: [fetchedFeed.feedTitle, feed.title, trimmedUrl],
                }),
              };
            }
            return { ...feed, error: "Feed not found in response" };
          });
          dispatch({ type: "set_feeds", feeds: updatedFeeds });
        } else {
          // If the entire request failed, mark all feeds as errored
          const updatedFeeds = initialFeeds.map((feed) => ({
            ...feed,
            error: result.message || "Failed to fetch feeds",
          }));
          dispatch({ type: "set_feeds", feeds: updatedFeeds });
        }

        return null;
      })().catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching feeds:", { error, errorMessage });
        if (!isMounted) {
          return { skipped: true as const };
        }

        // If there's an error, mark all feeds as errored
        const updatedFeeds = initialFeeds.map((feed) => ({
          ...feed,
          error: `Failed to fetch feeds: ${errorMessage}`,
        }));
        dispatch({ type: "set_feeds", feeds: updatedFeeds });
        return { skipped: false as const };
      });

      if (runResult?.skipped) {
        return;
      }

      finishLoading();
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
    dispatch({ type: "select_all_available" });
  };

  const handleToggleFeed = (url: string) => {
    dispatch({ type: "toggle_feed_selection", url });
  };

  const handleImport = () => {
    onImport(Array.from(selectedFeeds));
    dispatch({ type: "clear_selection" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-150 w-[95vw] max-h-[90vh] flex flex-col"
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
