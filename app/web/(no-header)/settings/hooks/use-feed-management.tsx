import { useCallback } from "react";
import { toast } from "sonner";
import { useRemoveFeedMutation } from "@/hooks/queries";

export function useFeedManagement() {
  const removeFeedMutation = useRemoveFeedMutation();

  const handleRemoveFeed = useCallback(
    (feedUrl: string) => {
      removeFeedMutation.mutate(feedUrl, {
        onSuccess: () => {
          toast.success("Feed removed", {
            description: "The feed has been removed from your subscriptions.",
          });
        },
        onError: (error: unknown) => {
          toast.error("Failed to remove feed", {
            description:
              (error as Error)?.message || "Failed to remove the feed. Please try again.",
          });
        },
      });
    },
    [removeFeedMutation]
  );

  const handleCopyFeed = useCallback((feedUrl: string) => {
    navigator.clipboard.writeText(feedUrl);
    toast.success("Feed URL copied", {
      description: "The feed URL has been copied to your clipboard.",
    });
  }, []);

  return {
    handleRemoveFeed,
    handleCopyFeed,
    isRemoving: removeFeedMutation.isPending,
  };
}
