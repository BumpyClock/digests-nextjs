"use client";

import { useCallback, useEffect } from "react";
import { FeedList } from "@/components/Feed/FeedList/FeedList";
import dynamic from "next/dynamic";

// Dynamic imports for heavy reader components to reduce initial bundle
const ReaderViewPane = dynamic(() => import("@/components/Feed/ReaderViewPane/ReaderViewPane").then(mod => ({ default: mod.ReaderViewPane })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FeedItem } from "@/types";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
const PodcastDetailsPane = dynamic(() => import("@/components/Podcast/PodcastDetailsPane").then(mod => ({ default: mod.PodcastDetailsPane })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
import { isPodcast } from "@/types/podcast";
import { FeedContextProvider, useFeedContext, useFeedNavigation } from "@/contexts/FeedContext";
import "./FeedMasterDetail.css";

interface FeedMasterDetailProps {
  items: FeedItem[];
  isLoading: boolean;
}

// Extract mobile view logic to separate component
function MobileFeedView() {
  const { selectedItem } = useFeedContext();
  const { showList, isAnimating, animationDirection, handleBackToList } = useFeedNavigation();

  // Determine animation classes based on direction
  const getAnimationClass = useCallback(() => {
    if (!isAnimating) return "";

    if (animationDirection === "to-reader") {
      return showList ? "slide-out-left" : "slide-in-right";
    } else {
      return showList ? "slide-in-left" : "slide-out-right";
    }
  }, [isAnimating, animationDirection, showList]);

  return (
    <div
      className="h-[calc(100vh-11rem)] mobile-feed-master-detail"
      id="feed-master-detail"
    >
      {showList ? (
        <div className={`mobile-feed-list ${getAnimationClass()}`}>
          <FeedList />
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

// Extract desktop view logic to separate component  
function DesktopFeedView() {
  const { selectedItem } = useFeedContext();

  return (
    <div className="h-[calc(100vh-11rem)]" id="feed-master-detail">
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-full rounded-lg border"
      >
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <FeedList />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={70}>
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

function FeedMasterDetailContent({ items, isLoading }: FeedMasterDetailProps) {
  const { selectedItem, setIsLoading: setContextLoading, setItems: setContextItems, resetState } = useFeedContext();
  const isMobile = useIsMobile();

  // Sync items with context
  useEffect(() => {
    setContextItems(items);
  }, [items, setContextItems]);

  // Sync loading state with context
  useEffect(() => {
    setContextLoading(isLoading);
  }, [isLoading, setContextLoading]);

  // Reset to show list when navigating back to a mobile view without a selection
  useEffect(() => {
    if (isMobile && !selectedItem) {
      resetState();
    }
  }, [isMobile, selectedItem, resetState]);

  return isMobile ? <MobileFeedView /> : <DesktopFeedView />;
}

export function FeedMasterDetail({ items, isLoading }: FeedMasterDetailProps) {
  const isMobile = useIsMobile();

  return (
    <FeedContextProvider isMobile={isMobile}>
      <FeedMasterDetailContent items={items} isLoading={isLoading} />
    </FeedContextProvider>
  );
}
