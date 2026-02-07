"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, Share2 } from "lucide-react";
import { fetchFeedsAction } from "@/app/actions";
import { useAudioActions } from "@/hooks/useFeedSelectors";
import Image from "next/image";
import type { FeedItem } from "@/types/feed";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton";
import { ContentNotFound } from "@/components/ContentNotFound";
import { useContentActions } from "@/hooks/use-content-actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { getPodcastAudioUrl } from "@/types/podcast";

export default function PodcastPage() {
  const params = useParams<{ id?: string }>();
  const [podcast, setPodcast] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const router = useRouter();
  const { playAudio } = useAudioActions();
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("podcast");
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

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="relative w-full md:w-1/3 aspect-square overflow-hidden rounded-lg">
            <Image
              src={podcast.thumbnail || "/placeholder-podcast.svg"}
              alt={podcast.title}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{podcast.title}</h1>
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                {publisherInitial}
              </div>
              <p className="font-medium">{publisher}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(podcast.published).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              {podcast.duration ? `• ${podcast.duration}` : ""}
            </p>
            <div className="flex space-x-2 mb-6">
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
              <h2 className="text-xl font-bold">Episode Description</h2>
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
      </div>
    </div>
  );
}
