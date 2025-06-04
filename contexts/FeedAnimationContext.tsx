"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { MotionConfig } from "motion/react"

interface AnimationContextValue {
  activeItemId: string | null
  setActiveItemId: (id: string | null) => void
  animationEnabled: boolean
}

const FeedAnimationContext = createContext<AnimationContextValue>({
  activeItemId: null,
  setActiveItemId: () => {},
  animationEnabled: true,
})

export function FeedAnimationProvider({ children }: { children: ReactNode }) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  
  useEffect(() => {
    // Check both feature flag and reduced motion preference
    const featureFlagEnabled = process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS === "true"
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    
    setAnimationEnabled(featureFlagEnabled && !prefersReducedMotion)
    
    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = (e: MediaQueryListEvent) => {
      setAnimationEnabled(featureFlagEnabled && !e.matches)
    }
    
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])
  
  return (
    <FeedAnimationContext.Provider value={{ activeItemId, setActiveItemId, animationEnabled }}>
      <MotionConfig reducedMotion={animationEnabled ? "never" : "always"}>
        {children}
      </MotionConfig>
    </FeedAnimationContext.Provider>
  )
}

export const useFeedAnimation = () => {
  const context = useContext(FeedAnimationContext)
  if (!context) {
    throw new Error("useFeedAnimation must be used within FeedAnimationProvider")
  }
  return context
}