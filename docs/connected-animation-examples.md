# Connected Animation Implementation Examples

## 1. Animation Context Setup

```tsx
// contexts/FeedAnimationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MotionConfig } from "motion";

interface AnimationContextValue {
  activeItemId: string | null;
  setActiveItemId: (id: string | null) => void;
  animationEnabled: boolean;
}

const FeedAnimationContext = createContext<AnimationContextValue>({
  activeItemId: null,
  setActiveItemId: () => {},
  animationEnabled: true,
});

export function FeedAnimationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // Check for reduced motion preference (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      setAnimationEnabled(!event.matches);
    };

    setAnimationEnabled(!mediaQuery.matches);
    mediaQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handlePreferenceChange);
    };
  }, []);

  return (
    <FeedAnimationContext.Provider
      value={{ activeItemId, setActiveItemId, animationEnabled }}
    >
      <MotionConfig reducedMotion={animationEnabled ? "never" : "always"}>
        {children}
      </MotionConfig>
    </FeedAnimationContext.Provider>
  );
}

export const useFeedAnimation = () => useContext(FeedAnimationContext);
```

## 2. Enhanced FeedCard with Motion

```tsx
// components/Feed/FeedCard/MotionFeedCard.tsx
import { motion, AnimatePresence } from "motion";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";

export const MotionFeedCard = ({ feedItem }: { feedItem: FeedItem }) => {
  const { setActiveItemId, activeItemId } = useFeedAnimation();
  const isActive = activeItemId === feedItem.id;

  return (
    <motion.article
      layoutId={`card-${feedItem.id}`}
      onClick={() => setActiveItemId(feedItem.id)}
      className="relative"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Shared thumbnail */}
      <motion.div
        layoutId={`thumbnail-container-${feedItem.id}`}
        className="relative overflow-hidden rounded-[32px]"
      >
        <motion.img
          layoutId={`thumbnail-${feedItem.id}`}
          src={thumbnailUrl}
          alt={feedItem.title}
          className="w-full h-full object-cover"
          transition={{
            layout: { type: "spring", stiffness: 300, damping: 30 },
          }}
        />
      </motion.div>

      {/* Shared metadata */}
      <motion.div
        layoutId={`metadata-${feedItem.id}`}
        className="flex items-center gap-2 mt-3"
      >
        <motion.img
          layoutId={`favicon-${feedItem.id}`}
          src={feedItem.favicon}
          className="w-6 h-6"
        />
        <motion.span layoutId={`site-title-${feedItem.id}`}>
          {feedItem.siteTitle}
        </motion.span>
      </motion.div>

      {/* Shared title */}
      <motion.h3
        layoutId={`title-${feedItem.id}`}
        className="font-semibold line-clamp-2 mt-2"
      >
        {feedItem.title}
      </motion.h3>

      {/* Card-only elements (will fade out) */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-muted-foreground line-clamp-2">
              {feedItem.description}
            </p>
            <CardFooter feedItem={feedItem} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
```

## 3. Motion-Enhanced BaseModal

```tsx
// components/MotionBaseModal.tsx
import { motion, AnimatePresence } from "motion";
import { useFeedAnimation } from "@/contexts/FeedAnimationContext";
import * as Dialog from "@radix-ui/react-dialog";

interface MotionBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  children: React.ReactNode;
}

export function MotionBaseModal({
  isOpen,
  onClose,
  itemId,
  children,
}: MotionBaseModalProps) {
  const { setActiveItemId } = useFeedAnimation();

  const handleClose = () => {
    setActiveItemId(null);
    // Delay actual close to allow exit animation
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={handleClose}>
          <Dialog.Portal>
            {/* Animated backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </Dialog.Overlay>

            {/* Animated content */}
            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-4 md:inset-8 lg:inset-12 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  layoutId={`card-${itemId}`}
                  className="bg-background rounded-3xl h-full overflow-hidden shadow-2xl"
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                  }}
                >
                  {children}
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
```

## 4. Motion Reader View Modal

```tsx
// components/MotionReaderViewModal.tsx
import { motion } from "motion";
import { MotionBaseModal } from "./MotionBaseModal";

export function MotionReaderViewModal({ feedItem, isOpen, onClose }: Props) {
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <MotionBaseModal isOpen={isOpen} onClose={onClose} itemId={feedItem.id}>
      <div className="h-full overflow-auto">
        {/* Shared thumbnail with parallax */}
        <motion.div
          layoutId={`thumbnail-container-${feedItem.id}`}
          className="relative w-full overflow-hidden aspect-[16/9]"
        >
          <motion.img
            layoutId={`thumbnail-${feedItem.id}`}
            src={feedItem.thumbnail}
            className="w-full h-full object-cover"
            style={{ y: parallaxOffset }}
          />
        </motion.div>

        <div className="p-6 md:p-8">
          {/* Shared metadata */}
          <motion.div
            layoutId={`metadata-${feedItem.id}`}
            className="flex items-center gap-2 mb-4"
          >
            <motion.img
              layoutId={`favicon-${feedItem.id}`}
              src={feedItem.favicon}
              className="w-6 h-6"
            />
            <motion.span layoutId={`site-title-${feedItem.id}`}>
              {feedItem.siteTitle}
            </motion.span>
          </motion.div>

          {/* Shared title */}
          <motion.h1
            layoutId={`title-${feedItem.id}`}
            className="text-3xl font-bold mb-6"
          >
            {feedItem.title}
          </motion.h1>

          {/* Modal-only content with stagger */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={contentVariants} className="flex gap-4 mb-6">
              <Button>Share</Button>
              <Button>Save</Button>
              <Button>Open Original</Button>
            </motion.div>

            <motion.article
              variants={contentVariants}
              className="prose prose-lg"
            >
              {readerContent}
            </motion.article>
          </motion.div>
        </div>
      </div>
    </MotionBaseModal>
  );
}
```

## 5. Custom Spring Configurations

```tsx
// utils/animation-config.ts
export const springConfig = {
  gentle: { type: "spring", stiffness: 120, damping: 20 },
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  smooth: { type: "spring", stiffness: 200, damping: 25 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: springConfig.gentle,
};

export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: springConfig.smooth,
};
```

## 6. Podcast-Specific Animations

```tsx
// For podcast cards with play button
<motion.div
  layoutId={`play-button-${podcast.id}`}
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
>
  <PodcastPlayButton podcast={podcast} />
</motion.div>

// In podcast modal - the play button animates to new position
<motion.div
  layoutId={`play-button-${podcast.id}`}
  className="absolute bottom-8 right-8"
>
  <PodcastPlayButton podcast={podcast} size="large" />
</motion.div>
```

## 7. Gesture-Based Closing

```tsx
// Add swipe-to-close for mobile
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100) {
      onClose();
    }
  }}
>
  {/* Modal content */}
</motion.div>
```

## Key Animation Principles

1. **Shared Layout IDs**: Must be unique and consistent between card and modal
2. **Stagger Children**: Secondary elements appear after primary transition
3. **Spring Physics**: More natural than duration-based animations
4. **Exit Animations**: Always implement for smooth closing
5. **Performance**: Use transform and opacity for GPU acceleration
6. **Accessibility**: Respect prefers-reduced-motion

## Animation Timing Guidelines

- Card hover: 150ms
- Card tap: 100ms
- Shared element transition: 300-400ms
- Secondary content fade-in: 200-300ms after main transition
- Total animation: Under 600ms
- Exit animation: 200-300ms
