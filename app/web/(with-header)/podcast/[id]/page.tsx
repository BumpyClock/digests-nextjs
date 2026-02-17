"use client";

import { Bookmark, Share2 } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchFeedsAction } from "@/app/actions";
import { ContentNotFound } from "@/components/ContentNotFound";
import { ContentDetailShell, ContentDetailToolbar } from "@/components/ContentDetailShell";
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton";
import { Button } from "@/components/ui/button";
import { useContentActions } from "@/hooks/use-content-actions";
import { useToast } from "@/hooks/use-toast";
import { useAudioActions } from "@/hooks/useFeedSelectors";
import type { FeedItem } from "@/types/feed";
import { getPodcastAudioUrl } from "@/types/podcast";
import { sanitizeReaderContent } from "@/utils/html";

export default function PodcastPage() {
  const params = useParams<{ id?: string }>();
  const [podcast, setPodcast] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { playAudio } = useAudioActions();
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions({
    contentType: "podcast",
  });
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadPodcast() {
      const id = params?.id as string | undefined;
      if (!id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        const { success, items } = await fetchFeedsAction(id);

        if (!isMounted) {
          return;
        }

        if (success && items) {
          const foundPodcast = items.find(
            (item: FeedItem) => item.id === id && item.type === "podcast"
          );

          if (foundPodcast) {
            setPodcast(foundPodcast);
            setIsBookmarked(foundPodcast.favorite || false);
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Failed to load podcast:", { err, errorMessage });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPodcast();

    return () => {
      isMounted = false;
    };
  }, [params?.id]);

  const handleBookmark = async () => {
    if (!podcast) return;
    await bookmarkAction(podcast.id, isBookmarked, setIsBookmarked);
  };

  const handlePlay = () => {
    if (podcast) {
      const audioUrl = getPodcastAudioUrl(podcast);
      if (!audioUrl) {
        console.warn("Audio unavailable for podcast episode", {
          podcastId: podcast.id,
          podcastTitle: podcast.title,
        });
        toast({
          title: "Audio unavailable",
          description: "Audio unavailable for this episode",
          variant: "destructive",
        });
        return;
      }

      playAudio({
        id: podcast.id,
        title: podcast.title,
        source: podcast.feedTitle || podcast.author || podcast.link || "Podcast",
        audioUrl,
        image: podcast.thumbnail,
      });
    }
  };

  const publisher = podcast?.feedTitle || podcast?.author || podcast?.link || "Unknown publisher";
  const publisherInitial = publisher.charAt(0).toUpperCase();

  if (loading) {
    return <ContentPageSkeleton />;
  }

  if (!podcast) {
    return <ContentNotFound contentType="Podcast" />;
  }

  const publishedDisplay = new Date(podcast.published).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ContentDetailShell title={podcast.title} titleClassName="mb-2">
      <div className="flex gap-6 mb-6 flex-col md:flex-row">
        <div className="relative aspect-square overflow-hidden rounded-lg w-full md:w-1/3">
          <Image
            src={podcast.thumbnail || "/placeholder-podcast.svg"}
            alt={podcast.title}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="flex-1">
          <ContentDetailToolbar
            metadata={
              <>
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                  {publisherInitial}
                </div>
                <p className="text-subtitle text-primary-content">{publisher}</p>
              </>
            }
            className="mb-4"
          />
          <p className="mb-4 text-body-small text-secondary-content">
            {publishedDisplay} {podcast.duration ? `• ${podcast.duration}` : ""}
          </p>
          <div className="mb-6 flex space-x-2">
            <Button onClick={handlePlay}>Play Episode</Button>
            <Button variant="outline" onClick={handleBookmark}>
              <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
              {isBookmarked ? "Saved" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => handleShare(podcast.link, podcast.title)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
          <div className="space-y-4">
            <h2 className="text-title-large text-primary-content">Episode Description</h2>
            <div className="prose prose-sm dark:prose-invert">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeReaderContent(podcast.content || podcast.description || ""),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ContentDetailShell>
  );
}

