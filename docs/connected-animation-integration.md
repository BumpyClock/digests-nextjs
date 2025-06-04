# Integration Guide for Connected Animations

## Specific Integration Points for Your Codebase

### 1. Working with Radix UI Dialog

Since you're using Radix UI Dialog, we need to handle the animation carefully:

```tsx
// Modify BaseModal to support motion
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion";

export function BaseModal({ isOpen, onClose, children, ...props }) {
  // Keep Dialog.Root controlled externally
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

### 2. Integrating with Existing ScrollArea

Your custom ScrollArea component can be enhanced with motion:

```tsx
// Wrap ScrollArea content with motion
<ScrollArea variant="modal">
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4 }}
  >
    <ReaderContent />
  </motion.div>
</ScrollArea>
```

### 3. Leveraging Existing Position Capture

Your current position capture in FeedCard is perfect:

```tsx
const handleCardClick = useCallback(
  (e: React.MouseEvent<HTMLDivElement>) => {
    // Your existing code
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setInitialPosition({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    // Add this for motion
    setActiveItemId(feedItem.id);

    // Continue with existing logic
  },
  [feedItem.id]
);
```

### 4. Progressive Image Integration

Your ProgressiveImage component works great with layout animations:

```tsx
<motion.div layoutId={`image-container-${feedItem.id}`}>
  <ProgressiveImage
    src={feedItem.thumbnail}
    alt={feedItem.title}
    initialSrc={feedCardThumbnailUrl}
    // Motion will handle the container animation
  />
</motion.div>
```

### 5. Handling Different Modal Types

Since you have both ReaderViewModal and PodcastDetailsModal:

```tsx
// Create a motion wrapper that both can use
export function MotionModalWrapper({
  type,
  feedItem,
  children,
}: {
  type: "article" | "podcast";
  feedItem: FeedItem;
  children: React.ReactNode;
}) {
  const layoutPrefix = type === "podcast" ? "podcast" : "article";

  return (
    <>
      <motion.div layoutId={`${layoutPrefix}-image-${feedItem.id}`}>
        {/* Image */}
      </motion.div>
      <motion.div layoutId={`${layoutPrefix}-title-${feedItem.id}`}>
        {/* Title */}
      </motion.div>
      {children}
    </>
  );
}
```

### 6. Performance Optimizations

Given your performance monitoring middleware:

```tsx
// Add animation performance tracking
const trackAnimationPerformance = () => {
  if (process.env.NODE_ENV === "development") {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      console.log(`Animation duration: ${duration}ms`);

      // Log to your performance middleware
      if (duration > 600) {
        console.warn("Animation exceeded 600ms threshold");
      }
    };
  }
};
```

## Migration Steps

### Phase 1: Setup (Non-Breaking)

1. Install motion: `pnpm add motion`
2. Create animation context and providers
3. Add motion config to app layout

### Phase 2: Create Motion Components (Non-Breaking)

1. Create MotionFeedCard alongside existing FeedCard
2. Create MotionBaseModal alongside BaseModal
3. Test in isolation with feature flag

### Phase 3: Integration (Gradual)

1. Add layoutId to existing components
2. Implement shared element animations
3. Test with reduced motion preferences

### Phase 4: Polish

1. Add gesture controls
2. Fine-tune spring configurations
3. Add loading state animations

## Potential Challenges & Solutions

### 1. Z-Index Issues

**Problem**: Animating elements might appear above/below wrong elements
**Solution**: Use motion's `style` prop for dynamic z-index during animation

### 2. Layout Shift

**Problem**: Content might jump during animation
**Solution**: Use `layout="position"` for elements that shouldn't affect layout

### 3. ScrollArea Conflicts

**Problem**: Scroll position might reset during animation
**Solution**: Preserve and restore scroll position:

```tsx
const scrollPos = useRef(0);
// Save before animation
scrollPos.current = scrollArea.scrollTop;
// Restore after animation
scrollArea.scrollTop = scrollPos.current;
```

### 4. Mobile Performance

**Problem**: Complex animations might be janky on mobile
**Solution**: Simplify animations on mobile:

```tsx
const isMobile = useIsMobile();
const transition = isMobile
  ? { duration: 0.2 }
  : { type: "spring", stiffness: 300 };
```

## Testing Checklist

- [ ] Test with fast clicking (rapid open/close)
- [ ] Test with keyboard navigation
- [ ] Test with screen readers
- [ ] Test on low-end devices
- [ ] Test with slow network (image loading)
- [ ] Test with prefers-reduced-motion
- [ ] Test exit animations on ESC key
- [ ] Test with different viewport sizes
- [ ] Test with long content (scroll behavior)
- [ ] Test with missing images
