"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FeedList } from "@/components/Feed/FeedList/FeedList";
import { ReaderViewPane } from "@/components/Feed/ReaderViewPane/ReaderViewPane";
import { PodcastDetailsPane } from "@/components/Podcast/PodcastDetailsPane/PodcastDetailsPane";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-media-query";
import { motionTokens } from "@/lib/motion-tokens";
import { useFeedItemsController } from "@/components/Feed/shared/useFeedItemsController";
import { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import { ScrollProvider } from "@/contexts/ScrollContext";

interface FeedMasterDetailProps {
  items: FeedItem[];
  isLoading: boolean;
}

const MOBILE_SLIDE_MS = Math.round(motionTokens.duration.normal * 1000);

export function FeedMasterDetail({ items, isLoading }: FeedMasterDetailProps) {
  const {
    items: normalizedItems,
    selectedItem,
    setSelectedItem,
    clearSelection,
  } = useFeedItemsController({ items });
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
    [isMobile, setSelectedItem]
  );

  const handleBackToList = useCallback(() => {
    clearSelection();
    setAnimationDirection("to-list");
    setIsAnimating(true);
    setShowList(true);
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), MOBILE_SLIDE_MS);
  }, [clearSelection]);

  // Determine animation classes based on direction
  const getAnimationClass = useCallback(() => {
    if (!isAnimating) return "";

    if (animationDirection === "to-reader") {
      return "animate-in slide-in-from-right-full fade-in-0 duration-normal ease-emphasized motion-reduce:animate-none";
    }

    return "animate-in slide-in-from-left-full fade-in-0 duration-normal ease-emphasized motion-reduce:animate-none";
  }, [isAnimating, animationDirection]);

  // On mobile: show either the list or the detail view
  if (isMobile) {
    return (
      <ScrollProvider>
        <div className="h-full flex flex-col overflow-hidden" id="feed-master-detail">
          {showList ? (
            <div className={`h-full overflow-hidden w-full relative ${getAnimationClass()}`}>
              <FeedList
                items={normalizedItems}
                isLoading={isLoading}
                selectedItem={selectedItem}
                onItemSelect={handleItemSelect}
                savedScrollPosition={scrollPosition}
              />
            </div>
          ) : (
            <div className={`h-full flex flex-col w-full relative ${getAnimationClass()}`}>
              <div className="p-2 border-b border-border bg-background sticky top-0 z-10">
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
              <div className="flex-1 overflow-hidden">
                {selectedItem && isPodcast(selectedItem) ? (
                  <PodcastDetailsPane feedItem={selectedItem} onClose={handleBackToList} />
                ) : (
                  <ReaderViewPane feedItem={selectedItem} onClose={handleBackToList} />
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollProvider>
    );
  }

  // On desktop: show the resizable panel group
  return (
    <ScrollProvider>
      <div className="h-full min-h-0" id="feed-master-detail">
        <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 rounded-lg border">
          <ResizablePanel defaultSize="30%" minSize="300px" maxSize="45%">
            <FeedList
              items={normalizedItems}
              isLoading={isLoading}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="70%">
            {selectedItem && isPodcast(selectedItem) ? (
              <PodcastDetailsPane feedItem={selectedItem} onClose={handleBackToList} />
            ) : (
              <ReaderViewPane feedItem={selectedItem} onClose={handleBackToList} />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ScrollProvider>
  );
}
