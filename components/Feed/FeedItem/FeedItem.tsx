// ABOUTME: Individual feed item component with React Query state management
// ABOUTME: Provides feed item actions like refresh, delete, and edit with optimistic updates

"use client";

import { memo, useState, useCallback } from "react";
import { Feed } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Rss,
  MoreVertical,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  useDeleteFeed,
  useRefreshFeed,
} from "@/hooks/queries/use-feed-mutations";
import { useFeed } from "@/hooks/queries/use-feed";
import { FEATURES } from "@/config/feature-flags";
import { formatDistanceToNow } from "date-fns";
import { cleanupTextContent } from "@/utils/htmlUtils";
import Image from "next/image";

interface FeedItemProps {
  feed: Feed;
  onEdit?: (feed: Feed) => void;
  className?: string;
}

export const FeedItem = memo(function FeedItem({
  feed,
  onEdit,
  className,
}: FeedItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // React Query hooks
  const deleteFeedMutation = useDeleteFeed();
  const refreshFeedMutation = useRefreshFeed();
  // const updateFeedMutation = useUpdateFeed();
  const { data: feedData, isLoading: isFeedLoading } = useFeed(feed.guid, {
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS;

  // Get the most up-to-date feed data
  const currentFeed = feedData?.feed || feed;
  const itemCount = feedData?.items?.length || 0;

  const handleRefresh = useCallback(async () => {
    if (!isFeatureEnabled) return;

    try {
      await refreshFeedMutation.mutateAsync(feed.guid);
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    }
  }, [refreshFeedMutation, feed.guid, isFeatureEnabled]);

  const handleDelete = useCallback(async () => {
    if (!isFeatureEnabled) return;

    try {
      await deleteFeedMutation.mutateAsync(feed.feedUrl);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete feed:", error);
    }
  }, [deleteFeedMutation, feed.feedUrl, isFeatureEnabled]);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(currentFeed);
    }
  }, [onEdit, currentFeed]);

  const handleVisitSite = useCallback(() => {
    if (currentFeed.link) {
      window.open(currentFeed.link, "_blank", "noopener,noreferrer");
    }
  }, [currentFeed.link]);

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLastUpdated = () => {
    const date = currentFeed.lastUpdated || currentFeed.lastRefreshed;
    if (!date) return "Never";

    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const isLoading =
    deleteFeedMutation.isPending ||
    refreshFeedMutation.isPending ||
    isFeedLoading;
  const hasError = deleteFeedMutation.isError || refreshFeedMutation.isError;

  return (
    <Card className={`${className} ${isLoading ? "opacity-75" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            {/* Feed Icon */}
            <div className="flex-shrink-0">
              {currentFeed.favicon && isValidUrl(currentFeed.favicon) ? (
                <Image
                  src={currentFeed.favicon}
                  alt={cleanupTextContent(currentFeed.siteTitle)}
                  width={24}
                  height={24}
                  className="rounded w-6 h-6"
                />
              ) : (
                <Rss className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            {/* Feed Info */}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg line-clamp-1">
                {cleanupTextContent(
                  currentFeed.feedTitle || currentFeed.siteTitle,
                )}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {cleanupTextContent(currentFeed.description) ||
                  "No description available"}
              </CardDescription>

              {/* Feed Stats */}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>{itemCount} items</span>
                <span>•</span>
                <span>Updated {getLastUpdated()}</span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleRefresh}
                disabled={!isFeatureEnabled || isLoading}
              >
                {refreshFeedMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </DropdownMenuItem>

              {currentFeed.link && (
                <DropdownMenuItem onClick={handleVisitSite}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Site
                </DropdownMenuItem>
              )}

              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                    disabled={!isFeatureEnabled || isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Feed</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;
                      {cleanupTextContent(
                        currentFeed.feedTitle || currentFeed.siteTitle,
                      )}
                      &quot;? This action cannot be undone and will remove all
                      associated articles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteFeedMutation.isPending}
                    >
                      {deleteFeedMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Feed"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <Badge
            variant="outline"
            className={getStatusColor(currentFeed.status)}
          >
            {refreshFeedMutation.isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Refreshing
              </>
            ) : refreshFeedMutation.isSuccess ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                {currentFeed.status}
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Error
              </>
            ) : (
              currentFeed.status
            )}
          </Badge>

          {/* Feed URL (truncated) */}
          <span className="text-xs text-muted-foreground truncate ml-2 max-w-[200px]">
            {currentFeed.feedUrl}
          </span>
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>
                {deleteFeedMutation.error?.message ||
                  refreshFeedMutation.error?.message ||
                  "An error occurred"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
