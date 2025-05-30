"use client";

import { useCallback, useEffect } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { EmptyState } from "@/components/Feed/ArticleReader/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";
import { useAudioActions, useIsAudioPlaying } from "@/hooks/useFeedSelectors";
import { type FeedItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { formatDuration } from "@/utils/formatDuration";
import Image from "next/image";
import { cleanupTextContent } from "@/utils/htmlUtils";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
}

export function PodcastDetailsPane({ feedItem }: PodcastDetailsPaneProps) {
  const { markAsRead } = useFeedStore();
  const { playAudio } = useAudioActions();
  const isCurrentlyPlaying = useIsAudioPlaying(feedItem?.id || "");
  
  // Mark as read after viewing
  useEffect(() => {
    if (feedItem) {
      const timer = setTimeout(() => {
        markAsRead(feedItem.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [feedItem, markAsRead]);

  const handlePlayPause = useCallback(() => {
    if (!feedItem) return;
    
    playAudio({
      id: feedItem.id,
      title: feedItem.title,
      source: feedItem.siteTitle,
      audioUrl: feedItem.enclosures?.[0]?.url || "",
      image: feedItem.thumbnail || feedItem.favicon,
    });
  }, [feedItem, playAudio]);

  if (!feedItem) {
    return <EmptyState />;
  }

  const duration = formatDuration(
    feedItem.duration || feedItem.enclosures?.[0]?.length || "0"
  );

  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <Scrollbars 
        style={{ width: '100%', height: '100%' }}
        autoHide
      >
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* Podcast Artwork */}
            <div className="relative w-full lg:w-1/3 aspect-square overflow-hidden rounded-lg">
              <Image
                src={feedItem.thumbnail || "/placeholder-podcast.svg"}
                alt={feedItem.title}
                className="object-cover w-full h-full"
                width={400}
                height={400}
                priority
              />
            </div>
            
            {/* Podcast Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-4">{cleanupTextContent(feedItem.title)}</h1>
              
              <div className="flex items-center mb-4">
                {feedItem.favicon && (
                  <Image
                    src={feedItem.favicon}
                    alt={cleanupTextContent(feedItem.siteTitle)}
                    width={24}
                    height={24}
                    className="rounded mr-2"
                  />
                )}
                <p className="font-medium">{cleanupTextContent(feedItem.siteTitle)}</p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(feedItem.published).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                • {duration}
              </p>
              
              {feedItem.author && (
                <p className="text-sm text-muted-foreground mb-4">
                  By {cleanupTextContent(feedItem.author)}
                </p>
              )}
              
              <Button size="lg" onClick={handlePlayPause}>
                {isCurrentlyPlaying ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Play Episode
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Episode Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Episode Description</h2>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: feedItem.content || feedItem.description 
              }} 
            />
          </div>
        </div>
      </Scrollbars>
    </div>
  );
}