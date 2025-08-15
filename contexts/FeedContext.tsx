"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { FeedItem } from "@/types";
import { useLoadingState, LoadingState, LoadingActions } from "@/hooks/useLoadingState";

interface FeedContextState {
  // Data state
  items: FeedItem[];
  setItems: (items: FeedItem[]) => void;
  
  // Selection state
  selectedItem: FeedItem | null;
  setSelectedItem: (item: FeedItem | null) => void;
  
  // Enhanced loading states
  loadingState: LoadingState;
  loadingActions: LoadingActions;
  
  // Backward compatibility
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Mobile navigation state
  showList: boolean;
  setShowList: (show: boolean) => void;
  
  // Scroll position management
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  
  // Animation state
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
  animationDirection: "to-reader" | "to-list";
  setAnimationDirection: (direction: "to-reader" | "to-list") => void;
  
  // Actions
  handleItemSelect: (item: FeedItem, scrollTop?: number) => void;
  handleBackToList: () => void;
  resetState: () => void;
}

const FeedContext = createContext<FeedContextState | undefined>(undefined);

interface FeedContextProviderProps {
  children: ReactNode;
  isMobile?: boolean;
}

export function FeedContextProvider({ children, isMobile = false }: FeedContextProviderProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [loadingState, loadingActions] = useLoadingState("idle", {
    enableAutoReset: false, // Manual control for feeds
    timeout: 45000, // 45 seconds for API calls
  });
  const [showList, setShowList] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"to-reader" | "to-list">("to-reader");

  // Backward compatibility
  const isLoading = loadingState.isLoading || loadingState.isRefreshing || loadingState.isInitializing;
  const setIsLoading = useCallback((loading: boolean) => {
    if (loading) {
      loadingActions.setLoading();
    } else {
      loadingActions.setIdle();
    }
  }, [loadingActions]);

  const handleItemSelect = useCallback(
    (item: FeedItem, scrollTop: number = 0) => {
      setSelectedItem(item);
      setScrollPosition(scrollTop);

      if (isMobile) {
        setAnimationDirection("to-reader");
        setIsAnimating(true);
        setShowList(false);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 300);
      }
    },
    [isMobile],
  );

  const handleBackToList = useCallback(() => {
    if (isMobile) {
      setAnimationDirection("to-list");
      setIsAnimating(true);
      setShowList(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isMobile]);

  const resetState = useCallback(() => {
    setSelectedItem(null);
    loadingActions.reset();
    setShowList(true);
    setScrollPosition(0);
    setIsAnimating(false);
    setAnimationDirection("to-reader");
  }, [loadingActions]);

  const value: FeedContextState = {
    items,
    setItems,
    selectedItem,
    setSelectedItem,
    loadingState,
    loadingActions,
    isLoading,
    setIsLoading,
    showList,
    setShowList,
    scrollPosition,
    setScrollPosition,
    isAnimating,
    setIsAnimating,
    animationDirection,
    setAnimationDirection,
    handleItemSelect,
    handleBackToList,
    resetState,
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeedContext() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error("useFeedContext must be used within a FeedContextProvider");
  }
  return context;
}

// Hook for components that only need selection state (read-only)
export function useFeedSelection() {
  const { selectedItem, handleItemSelect } = useFeedContext();
  return { selectedItem, handleItemSelect };
}

// Hook for components that only need loading state
export function useFeedLoading() {
  const { isLoading, setIsLoading, loadingState, loadingActions } = useFeedContext();
  return { 
    // Backward compatibility
    isLoading, 
    setIsLoading,
    // Enhanced loading state
    loadingState,
    loadingActions
  };
}

// Hook for mobile navigation components
export function useFeedNavigation() {
  const {
    showList,
    isAnimating,
    animationDirection,
    handleBackToList,
    scrollPosition,
  } = useFeedContext();
  
  return {
    showList,
    isAnimating,
    animationDirection,
    handleBackToList,
    scrollPosition,
  };
}