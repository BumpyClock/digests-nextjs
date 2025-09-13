"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/Feed/ArticleReader/ArticleReader";
import { useFeedStore } from "@/store/useFeedStore";
import { type FeedItem } from "@/types";
import { cleanupTextContent } from "@/utils/htmlUtils";
import { PodcastArtwork } from "../PodcastArtwork";
import { PodcastMetadata } from "../PodcastMetadata";
import { PodcastPlayButton } from "../shared/PodcastPlayButton";
import { sanitizeReaderContent } from "@/utils/htmlSanitizer";

interface PodcastDetailsPaneProps {
  feedItem: FeedItem | null;
}

export function PodcastDetailsPane({ feedItem }: PodcastDetailsPaneProps) {
  const { markAsRead } = useFeedStore();
  
  // Mark as read after viewing
  useEffect(() => {
    if (feedItem) {
      const timer = setTimeout(() => {
        markAsRead(feedItem.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [feedItem, markAsRead]);

  if (!feedItem) {
    return <EmptyState />;
  }


  return (
    <div className="h-full border rounded-md overflow-hidden bg-card">
      <ScrollArea 
        className="h-full w-full"
      >
        <div className="p-6">
          <div className={`flex flex-col gap-6 mb-6 ${feedItem.thumbnail ? 'lg:flex-row' : ''}`}>
            {/* Podcast Artwork */}
            {feedItem.thumbnail && (
              <div className="relative w-full lg:w-1/3">
                <PodcastArtwork
                  src={feedItem.thumbnail}
                  alt={feedItem.title}
                  size="xl"
                  showAmbilight={true}
                  className="aspect-square rounded-lg w-full"
                />
              </div>
            )}
            
            {/* Podcast Info */}
            <div className={feedItem.thumbnail ? "flex-1" : "w-full"}>
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
              
              <PodcastMetadata
                published={feedItem.published}
                duration={
                  typeof feedItem.duration === 'number'
                    ? feedItem.duration
                    : ((): number | undefined => {
                        const raw = (feedItem.duration as unknown) ?? feedItem.enclosures?.[0]?.length
                        const n = typeof raw === 'string' ? parseInt(raw, 10) : (raw as number | undefined)
                        return Number.isFinite(n as number) ? (n as number) : undefined
                      })()
                }
                author={feedItem.author ? cleanupTextContent(feedItem.author) : undefined}
                variant="compact"
                className="mb-4"
              />
              
              <PodcastPlayButton
                podcast={feedItem}
                size="lg"
                showLabel={true}
              />
            </div>
          </div>
          
          {/* Episode Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Episode Description</h2>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: sanitizeReaderContent(feedItem.content || feedItem.description || '') 
              }} 
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
