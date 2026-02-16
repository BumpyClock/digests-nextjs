"use client";

import { MotionConfig } from "motion/react";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useUiPreferencesStore } from "@/store/useUiPreferencesStore";

interface AnimationContextValue {
  animationEnabled: boolean;
}

const FeedAnimationContext = createContext<AnimationContextValue>({
  animationEnabled: true,
});

export function FeedAnimationProvider({ children }: { children: ReactNode }) {
  const userPreference = useUiPreferencesStore((state) => state.animationsEnabled);
  const [animationEnabled, setAnimationEnabled] = useState(userPreference);

  useEffect(() => {
    // Check both user preference and reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setAnimationEnabled(userPreference && !prefersReducedMotion);

    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      setAnimationEnabled(userPreference && !e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [userPreference]);

  return (
    <FeedAnimationContext.Provider value={{ animationEnabled }}>
      <MotionConfig
        reducedMotion={animationEnabled ? "never" : "always"}
        transition={animationEnabled ? undefined : { duration: 0 }}
      >
        {children}
      </MotionConfig>
    </FeedAnimationContext.Provider>
  );
}

export const useFeedAnimation = () => {
  const context = useContext(FeedAnimationContext);
  if (!context) {
    throw new Error("useFeedAnimation must be used within FeedAnimationProvider");
  }
  return context;
};
