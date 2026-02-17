"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FeedList } from "@/components/Feed/FeedList/FeedList";
import { ReaderViewPane } from "@/components/Feed/ReaderViewPane/ReaderViewPane";
import { PodcastDetailsPane } from "@/components/Podcast/PodcastDetailsPane";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-media-query";
import { motionTokens } from "@/lib/motion-tokens";
import { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import "./FeedMasterDetail.css";

interface FeedMasterDetailProps {
  items: FeedItem[];
  isLoading: boolean;
}

const MOBILE_SLIDE_MS = Math.round(motionTokens.duration.normal * 1000);

export function FeedMasterDetail({ items, isLoading }: FeedMasterDetailProps) {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const isMobile = useIsMobile();
  const [showList, setShowList] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"to-reader" | "to-list">(
    "to-reader"
  );
  const [scrollPosition, setScrollPosition] = useState(0);

  // Reset to show list when navigating back to a mobile view without a selection
  useEffect(() => {
    if (isMobile && !selectedItem) {
      setShowList(true);
    }
  }, [isMobile, selectedItem]);

  const handleItemSelect = useCallback(
    (item: FeedItem, scrollTop: number) => {
      setSelectedItem(item);
      // Save the current scroll position before navigating
      setScrollPosition(scrollTop);

      if (isMobile) {
        setAnimationDirection("to-reader");
        setIsAnimating(true);
        setShowList(false);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), MOBILE_SLIDE_MS);
      }
    },
    [isMobile]
  );

  const handleBackToList = useCallback(() => {
    setAnimationDirection("to-list");
    setIsAnimating(true);
    setShowList(true);
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), MOBILE_SLIDE_MS);
  }, []);

  // Determine animation classes based on direction
  const getAnimationClass = useCallback(() => {
    if (!isAnimating) return "";

    if (animationDirection === "to-reader") {
      return showList ? "slide-out-left" : "slide-in-right";
    } else {
      return showList ? "slide-in-left" : "slide-out-right";
    }
  }, [isAnimating, animationDirection, showList]);

  // On mobile: show either the list or the detail view
  if (isMobile) {
    return (
      <div className="h-full mobile-feed-master-detail" id="feed-master-detail">
        {showList ? (
          <div className={`mobile-feed-list ${getAnimationClass()}`}>
            <FeedList
              items={items}
              isLoading={isLoading}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              savedScrollPosition={scrollPosition}
            />
          </div>
        ) : (
          <div className={`mobile-reader-view ${getAnimationClass()}`}>
            <div className="mobile-reader-back-button">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </Button>
            </div>
            <div className="mobile-reader-content">
              {selectedItem && isPodcast(selectedItem) ? (
                <PodcastDetailsPane feedItem={selectedItem} />
              ) : (
                <ReaderViewPane feedItem={selectedItem} />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // On desktop: show the resizable panel group
  return (
    <div className="h-full min-h-0" id="feed-master-detail">
      <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 rounded-lg border">
        <ResizablePanel defaultSize="30%" minSize="300px" maxSize="45%">
          <FeedList
            items={items}
            isLoading={isLoading}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="70%">
          {selectedItem && isPodcast(selectedItem) ? (
            <PodcastDetailsPane feedItem={selectedItem} />
          ) : (
            <ReaderViewPane feedItem={selectedItem} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
