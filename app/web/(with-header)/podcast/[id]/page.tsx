"use client";

import { ArrowLeft, Bookmark, Share2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useReducer } from "react";
import { fetchFeedsAction } from "@/app/actions";
import ArticleMarkdownRenderer from "@/components/Feed/ArticleReader/ArticleMarkdownRenderer";
import { ContentNotFound } from "@/components/ContentNotFound";
import { ContentPageSkeleton } from "@/components/ContentPageSkeleton";
import { Button } from "@/components/ui/button";
import { useContentActions } from "@/hooks/use-content-actions";
import { useToast } from "@/hooks/use-toast";
import { useAudioActions } from "@/hooks/useFeedSelectors";
import type { FeedItem } from "@/types/feed";
import { getPodcastAudioUrl } from "@/types/podcast";

interface PodcastPageState {
  podcast: FeedItem | null;
  loading: boolean;
  isBookmarked: boolean;
}

type PodcastPageAction =
  | { type: "loading_started" }
  | { type: "loading_finished" }
  | { type: "podcast_loaded"; podcast: FeedItem }
  | { type: "bookmark_changed"; value: boolean };

const initialPodcastPageState: PodcastPageState = {
  podcast: null,
  loading: true,
  isBookmarked: false,
};

function podcastPageReducer(state: PodcastPageState, action: PodcastPageAction): PodcastPageState {
  switch (action.type) {
    case "loading_started":
      return { ...state, loading: true };
    case "loading_finished":
      return { ...state, loading: false };
    case "podcast_loaded":
      return {
        ...state,
        podcast: action.podcast,
        isBookmarked: action.podcast.favorite || false,
      };
    case "bookmark_changed":
      return { ...state, isBookmarked: action.value };
    default:
      return state;
  }
}

export default function PodcastPage() {
  const params = useParams<{ id?: string }>();
  const [state, dispatch] = useReducer(podcastPageReducer, initialPodcastPageState);
  const router = useRouter();
  const { playAudio } = useAudioActions();
  const { handleBookmark: bookmarkAction, handleShare } = useContentActions("podcast");
  const { toast } = useToast();
  const podcast = state.podcast;
  const isBookmarked = state.isBookmarked;

  useEffect(() => {
    let isMounted = true;
    const finishLoading = () => {
      if (isMounted) {
        dispatch({ type: "loading_finished" });
      }
    };

    async function loadPodcast() {
      const id = params?.id as string | undefined;
      if (!id) {
        finishLoading();
        return;
      }

      if (isMounted) {
        dispatch({ type: "loading_started" });
      }

      const result = await fetchFeedsAction(id)
        .then((value) => ({ ok: true as const, value }))
        .catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Failed to load podcast:", { err, errorMessage });
          return { ok: false as const };
        });

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        const { success, items } = result.value;
        if (success && items) {
          const foundPodcast = items.find(
            (item: FeedItem) => item.id === id && item.type === "podcast"
          );

          if (foundPodcast) {
            dispatch({ type: "podcast_loaded", podcast: foundPodcast });
          }
        }
      }

      finishLoading();
    }

    loadPodcast();

    return () => {
      isMounted = false;
    };
  }, [params?.id]);

  const handleBookmark = async () => {
    if (!podcast) return;
    await bookmarkAction(podcast.id, isBookmarked, (value) =>
      dispatch({ type: "bookmark_changed", value })
    );
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

  if (state.loading) {
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
            <h1 className="mb-2 text-display-small text-primary-content">{podcast.title}</h1>
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2">
                {publisherInitial}
              </div>
              <p className="text-subtitle text-primary-content">{publisher}</p>
            </div>
            <p className="mb-4 text-body-small text-secondary-content">
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
              <h2 className="text-title-large text-primary-content">Episode Description</h2>
              <ArticleMarkdownRenderer
                content={podcast.content || podcast.description || ""}
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
