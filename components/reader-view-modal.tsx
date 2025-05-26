"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { FeedItem } from "@/types";
import { BaseModal } from "./base-modal";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useReaderView } from "@/hooks/use-reader-view";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { ScrollShadow } from "./ui/scroll-shadow";
import { ReaderContent } from "@/components/Feed/ReaderContent";
import { UnifiedPlayer } from "@/components/player/UnifiedPlayer";
import { useUnifiedAudioStore, PlayerMode } from "@/store/useUnifiedAudioStore";

interface ReaderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItem: FeedItem;
  initialPosition: { x: number; y: number; width: number; height: number };
}

export function ReaderViewModal({
  feedItem,
  isOpen,
  onClose,
  initialPosition,
}: ReaderViewModalProps) {
  const { readerView, loading, cleanedContent } = useReaderView(feedItem, isOpen);
  const { scrollTop, isBottomVisible, handleScroll, hasScrolled } = useScrollShadow();
  
  // State to track audio state
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    playerMode: PlayerMode.DISABLED,
    isVisible: false
  });
  
  // Subscribe to audio state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get initial state
    const state = useUnifiedAudioStore.getState();
    setAudioState({
      isPlaying: state.isPlaying,
      playerMode: state.playerMode,
      isVisible: state.isVisible
    });
    
    // Subscribe to changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      state => ({
        isPlaying: state.isPlaying,
        playerMode: state.playerMode,
        isVisible: state.isVisible
      }),
      newState => {
        setAudioState(newState);
      }
    );
    
    return unsubscribe;
  }, []);
  
  // Keep a ref to the current text content for use in the close handler
  const textContentRef = useRef("");
  
  // Store the current text content in a ref for use when closing the modal
  useEffect(() => {
    if (readerView?.textContent) {
      textContentRef.current = readerView.textContent;
    } else if (feedItem.description) {
      textContentRef.current = feedItem.description;
    }
  }, [readerView, feedItem]);
  
  const parallaxOffset = useMemo(() => {
    return Math.min(scrollTop * 0.2, 50);
  }, [scrollTop]);
  
  // Force inline player mode when modal is open and audio is playing
  useEffect(() => {
    if (isOpen && audioState.isPlaying && audioState.playerMode !== PlayerMode.INLINE) {
      console.log("Modal open with active audio: Forcing inline player mode");
      useUnifiedAudioStore.getState().setPlayerMode(PlayerMode.INLINE);
    }
  }, [isOpen, audioState.isPlaying, audioState.playerMode]);
  
  // Handle modal open/close lifecycle
  useEffect(() => {
    // When the modal opens
    if (isOpen) {
      // Pre-initialize the audio store for faster response
      const store = useUnifiedAudioStore.getState();
      if (!store.isInitialized) {
        store.initialize().catch(error => {
          console.error("Error pre-initializing audio system:", error);
        });
      }
    }
    
    // Return cleanup function when modal closes
    return () => {
      // Only clean up if the modal is actually closing
      if (isOpen === false) {
        // This will run when the modal is unmounted or isOpen changes to false
        const store = useUnifiedAudioStore.getState();
        
        // If the TTS content belongs to this article specifically, check if we should clean up
        // We don't want to clean up if the audio is being played in mini mode or a different article
        const currentId = store.currentContent?.id;
        if (currentId && currentId === `article-${feedItem.id}` && !store.isPlaying) {
          console.log("Modal unmounted with its own TTS content loaded but not playing, cleaning up");
          store.stop();
        }
      }
    };
  }, [isOpen, feedItem.id]);
  
  // Handle modal close - ensure proper cleanup and state management
  const handleModalClose = () => {
    const store = useUnifiedAudioStore.getState();
    const currentContent = store.currentContent;
    const wasPlaying = audioState.isPlaying;
    
    // Get current content ID
    const currentContentId = currentContent?.id;
    const currentFeedItemId = `article-${feedItem.id}`;
    
    // Only perform audio-related actions if this article is the one playing
    if (currentContentId === currentFeedItemId) {
      if (wasPlaying) {
        console.log("Modal closing with active TTS: Switching to mini player");
        
        // Switch to mini player mode
        store.setPlayerMode(PlayerMode.MINI);
        
        // Small delay to ensure the state transition completes before the modal is fully closed
        setTimeout(() => {
          onClose();
        }, 150);
      } else {
        // If this article is loaded in TTS but not playing, do a full cleanup
        console.log("Modal closing with inactive TTS: Cleaning up");
        store.stop();
        onClose();
      }
    } else {
      // This article isn't the one playing, just close the modal
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={readerView?.title || "Loading..."}
      initialPosition={initialPosition}
      className=""
    >
      <div className="relative">
        <ScrollShadow visible={hasScrolled} position="top" />
        
        {/* Content scrollable area with adjusted padding to account for player */}
        <Scrollbars 
          style={{ 
            width: '100%', 
            height: 'calc(100vh - 10px)',
            paddingBottom: audioState.isVisible && audioState.isPlaying ? '160px' : '0' 
          }}
          autoHide
          onScrollFrame={handleScroll}
        > 
          <div className="mx-auto pb-32">
            <ReaderContent
              feedItem={feedItem}
              readerView={readerView}
              loading={loading}
              cleanedContent={cleanedContent}
              layout="modal"
              parallaxOffset={parallaxOffset}
            />
          </div>
        </Scrollbars>

        <ScrollShadow visible={isBottomVisible} position="bottom" />
        
        {/* Fixed position player at the bottom */}
        {typeof window !== 'undefined' && (
          <div 
            className={`fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300 border-t border-border ${
              audioState.isVisible && audioState.isPlaying && audioState.playerMode === PlayerMode.INLINE
                ? 'translate-y-0 opacity-100 shadow-lg'
                : 'translate-y-full opacity-0'
            }`}
          >
            <div className="w-full md:max-w-4xl mx-auto px-6 py-4">
              <UnifiedPlayer 
                key={`tts-player-${feedItem.id}`} 
                mode="inline" 
                minimizable={true}
              />
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}