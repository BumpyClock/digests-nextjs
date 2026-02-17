"use client";
import { Download, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AdaptiveDetailContainer } from "@/components/Feed/shared/AdaptiveDetailContainer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FeedItem } from "@/types";
import { getSiteDisplayName } from "@/utils/htmlUtils";
import { PodcastDetailsContent } from "../shared/PodcastDetailsContent";

interface PodcastDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  podcast: FeedItem;
}

export function PodcastDetailsModal({ isOpen, onClose, podcast }: PodcastDetailsModalProps) {
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: podcast.title,
          text: `Listen to ${podcast.title} from ${getSiteDisplayName(podcast)}`,
          url: podcast.link,
        });
      } else {
        await navigator.clipboard.writeText(podcast.link);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Failed to share");
      }
    }
  };

  const handleDownload = () => {
    const audioUrl = podcast.enclosures?.[0]?.url;
    if (audioUrl) {
      window.open(audioUrl, "_blank");
    }
  };

  const actionButtons = (
    <>
      <Button size="icon" variant="outline" onClick={handleShare} title="Share episode">
        <Share2 className="h-4 w-4" />
      </Button>

      {podcast.enclosures?.[0]?.url && (
        <Button size="icon" variant="outline" onClick={handleDownload} title="Download episode">
          <Download className="h-4 w-4" />
        </Button>
      )}

      <Button size="icon" variant="outline" asChild title="Open in browser">
        <a
          href={podcast.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open episode in browser"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </>
  );

  return (
    <AdaptiveDetailContainer
      isOpen={isOpen}
      onClose={onClose}
      title={podcast.title}
      itemId={podcast.id}
      mode="modal"
    >
      <ScrollArea variant="modal" className="h-full sm:h-[calc(95vh-2rem)]">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          <PodcastDetailsContent
            podcast={podcast}
            actionButtons={actionButtons}
            showAmbilight={true}
            variant="modal"
          />
        </div>
      </ScrollArea>
    </AdaptiveDetailContainer>
  );
}
