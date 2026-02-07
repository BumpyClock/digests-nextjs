import { useCallback, useRef, type FormEvent } from "react";
import { useAddFeedMutation } from "@/hooks/queries";
import { toast } from "sonner";

export function useFeedForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const addFeedMutation = useAddFeedMutation();

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const urlEntry = formData.get("feed-url");

      if (typeof urlEntry !== "string" || urlEntry.trim() === "") {
        toast.error("Please enter a feed URL");
        return;
      }
      const url = urlEntry.trim();

      try {
        await addFeedMutation.mutateAsync(url);

        if (formRef.current) {
          formRef.current.reset();
        }

        toast.success("Feed added successfully", {
          description: "The feed has been added to your subscriptions.",
          duration: 5000,
        });
      } catch (error: unknown) {
        console.error("Error adding feed:", error);
        toast.error("Failed to add feed", {
          description: (error as Error)?.message || "Failed to add the feed. Please try again.",
        });
      }
    },
    [addFeedMutation]
  );

  return {
    handleSubmit,
    formRef,
    loading: addFeedMutation.isPending,
  };
}
