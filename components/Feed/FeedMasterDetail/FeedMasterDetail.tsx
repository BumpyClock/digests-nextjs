"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { FeedList } from "@/components/Feed/FeedList/FeedList";
import { ReaderViewPane } from "@/components/Feed/ReaderViewPane/ReaderViewPane";
import { PodcastDetailsPane } from "@/components/Podcast/PodcastDetailsPane";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-media-query";
import { useFeedStore } from "@/store/useFeedStore";
import { FeedItem } from "@/types";
import { isPodcast } from "@/types/podcast";
import "./FeedMasterDetail.css";

interface FeedMasterDetailProps {
  items: FeedItem[];
  isLoading: boolean;
}

const MOBILE_SLIDE_MS = 220;

type AnimationDirection = "to-reader" | "to-list";

interface FeedMasterDetailState {
  selectedItem: FeedItem | null;
  showList: boolean;
  isAnimating: boolean;
  animationDirection: AnimationDirection;
  scrollPosition: number;
}

type FeedMasterDetailAction =
  | { type: "select-item"; item: FeedItem; scrollTop: number; isMobile: boolean }
  | { type: "back-to-list" }
  | { type: "animation-complete" };

const initialState: FeedMasterDetailState = {
  selectedItem: null,
  showList: true,
  isAnimating: false,
  animationDirection: "to-reader",
  scrollPosition: 0,
};

function feedMasterDetailReducer(
  state: FeedMasterDetailState,
  action: FeedMasterDetailAction
): FeedMasterDetailState {
  switch (action.type) {
    case "select-item":
      return {
        ...state,
        selectedItem: action.item,
        scrollPosition: action.scrollTop,
        ...(action.isMobile
          ? {
              animationDirection: "to-reader" as const,
              isAnimating: true,
              showList: false,
            }
          : {}),
      };
    case "back-to-list":
      return {
        ...state,
        animationDirection: "to-list",
        isAnimating: true,
        showList: true,
      };
    case "animation-complete":
      return {
        ...state,
        isAnimating: false,
      };
    default:
      return state;
  }
}

export function FeedMasterDetail({ items, isLoading }: FeedMasterDetailProps) {
  const [state, dispatch] = useReducer(feedMasterDetailReducer, initialState);
  const { markAsRead } = useFeedStore();
  const isMobile = useIsMobile();
  const markAsReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedItem, showList, isAnimating, animationDirection, scrollPosition } = state;
  const effectiveShowList = !selectedItem || showList;

  const clearMarkAsReadTimeout = useCallback(() => {
    if (!markAsReadTimeoutRef.current) return;
    clearTimeout(markAsReadTimeoutRef.current);
    markAsReadTimeoutRef.current = null;
  }, []);

  const handleItemSelect = useCallback(
    (item: FeedItem, scrollTop: number) => {
      clearMarkAsReadTimeout();
      dispatch({ type: "select-item", item, scrollTop, isMobile });

      if (isPodcast(item)) {
        markAsReadTimeoutRef.current = setTimeout(() => {
          markAsRead(item.id);
          markAsReadTimeoutRef.current = null;
        }, 2000);
      }

      if (isMobile) {
        setTimeout(() => dispatch({ type: "animation-complete" }), MOBILE_SLIDE_MS);
      }
    },
    [clearMarkAsReadTimeout, isMobile, markAsRead]
  );

  const handleBackToList = useCallback(() => {
    clearMarkAsReadTimeout();
    dispatch({ type: "back-to-list" });
    setTimeout(() => dispatch({ type: "animation-complete" }), MOBILE_SLIDE_MS);
  }, [clearMarkAsReadTimeout]);

  useEffect(() => clearMarkAsReadTimeout, [clearMarkAsReadTimeout]);

  const getAnimationClass = useCallback(() => {
    if (!isAnimating) return "";

    if (animationDirection === "to-reader") {
      return effectiveShowList ? "slide-out-left" : "slide-in-right";
    }
    return effectiveShowList ? "slide-in-left" : "slide-out-right";
  }, [isAnimating, animationDirection, effectiveShowList]);

  if (isMobile) {
    return (
      <div className="h-full mobile-feed-master-detail" id="feed-master-detail">
        {effectiveShowList ? (
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
