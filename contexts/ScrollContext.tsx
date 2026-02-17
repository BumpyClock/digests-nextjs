"use client";

import { createContext, ReactNode, useContext } from "react";
import { useScrollState } from "@/hooks/use-scroll-state";

interface ScrollContextValue {
  isScrolling: boolean;
  handleScroll: (input: Event | number) => void;
}

const ScrollContext = createContext<ScrollContextValue>({
  isScrolling: false,
  handleScroll: () => {},
});

export function ScrollProvider({ children }: { children: ReactNode }) {
  const { isScrolling, handleScroll } = useScrollState();

  return (
    <ScrollContext.Provider value={{ isScrolling, handleScroll }}>
      {children}
    </ScrollContext.Provider>
  );
}

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error("useScrollContext must be used within ScrollProvider");
  }
  return context;
};
