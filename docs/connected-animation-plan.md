# Connected Animation Implementation Plan

## Overview

Implement smooth, connected animations between FeedCard and detail modals (ReaderViewModal/PodcastDetailsModal) using the motion library .

## Current State Analysis

### Existing Infrastructure

- **Position Tracking**: Already capturing card position via `getBoundingClientRect()`
- **Modal System**: Using Radix UI Dialog with BaseModal wrapper
- **Shared Elements**: Thumbnail, title, metadata exist in both views
- **Progressive Images**: Already implemented for smooth image loading

### Current Limitations

- No shared element transitions
- Abrupt modal opening with basic zoom animation
- Position data underutilized
- No exit animations

## Implementation Strategy

### 1. Core Animation Concepts

- **Shared Layout Animation**: Elements smoothly transition between card and modal positions
- **Layout ID System**: Connect elements across different components
- **Staggered Animations**: Secondary elements fade/slide in after main transition
- **Exit Animations**: Reverse the expansion when closing

### 2. Technical Architecture

#### A. Install Dependencies

```bash
bun add motion
```

#### B. Create Animation Context

```typescript
// contexts/AnimationContext.tsx
interface AnimationState {
  activeItemId: string | null;
  isAnimating: boolean;
  animationSource: "card" | "modal" | null;
}
```

#### C. Shared Elements to Animate

1. **Primary Elements** (shared layout):
   - Thumbnail/Artwork
   - Title
   - Site metadata (favicon + name)
2. **Secondary Elements** (fade/slide in):
   - Article content
   - Additional metadata
   - Action buttons
   - Scroll areas

### 3. Implementation Phases

#### Phase 1: Setup Motion Components

- Wrap app with `MotionConfig` for global animation settings
- Create `AnimatePresence` wrapper for modals
- Convert key elements to motion components

#### Phase 2: Implement Card Animations

- Add `layoutId` to shared elements in FeedCard
- Implement press animations with motion
- Add hover states with smooth transitions

#### Phase 3: Modal Animations

- Match `layoutId` in modal components
- Implement staggered animations for non-shared elements
- Add smooth scroll appearance animations

#### Phase 4: Connected Transitions

- Create custom modal backdrop with motion
- Implement shared element transitions
- Add exit animations

### 4. Animation Timeline

```text
User clicks card (0ms)
├─ Card press animation (0-100ms)
├─ Capture position & start transition (100ms)
├─ Shared elements begin morphing (100-400ms)
│  ├─ Image expands to modal size
│  ├─ Title moves to new position
│  └─ Metadata repositions
├─ Modal backdrop fades in (200-400ms)
├─ Secondary elements stagger in (300-600ms)
│  ├─ Content fades in
│  ├─ Action buttons slide up
│  └─ Scroll indicators appear
└─ Animation complete (600ms)
```

### 5. Key Implementation Details

#### A. FeedCard Changes

```tsx
<motion.div layoutId={`card-container-${feedItem.id}`}>
  <motion.img
    layoutId={`thumbnail-${feedItem.id}`}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
  />
  <motion.h3 layoutId={`title-${feedItem.id}`}>{feedItem.title}</motion.h3>
</motion.div>
```

#### B. Modal Changes

```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div layoutId={`card-container-${feedItem.id}`}>
        <motion.img layoutId={`thumbnail-${feedItem.id}`} />
        <motion.h1 layoutId={`title-${feedItem.id}`} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Additional content */}
        </motion.div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

#### C. Custom Variants

```tsx
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    x: initialPosition.x,
    y: initialPosition.y,
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
};
```

### 6. Performance Considerations

- Use `will-change` for animated properties
- Implement `useReducedMotion` for accessibility
- Lazy load motion components
- Use GPU-accelerated properties (transform, opacity)

### 7. Progressive Enhancement

- Fallback to current behavior if motion is disabled
- Ensure animations don't block interaction
- Keep total animation under 600ms for responsiveness

### 8. Testing Strategy

- Test on various devices and screen sizes
- Verify smooth 60fps animations
- Test with reduced motion preferences
- Ensure no layout shifts or flickers

## Implementation Order

1. **Setup Phase** (30 min)

   - Install motion
   - Create animation context
   - Setup MotionConfig

2. **Basic Motion Components** (1 hour)

   - Convert FeedCard elements
   - Convert Modal elements
   - Add layoutId connections

3. **Shared Transitions** (2 hours)

   - Implement image transitions
   - Add title animations
   - Connect metadata elements

4. **Polish & Secondary Animations** (1 hour)

   - Add stagger effects
   - Implement exit animations
   - Fine-tune timing

5. **Testing & Optimization** (30 min)
   - Performance testing
   - Accessibility checks
   - Cross-browser testing

## Expected Outcome

A smooth, delightful animation where clicking a feed card causes its elements to seamlessly expand and morph into the modal view, creating a clear visual connection between the two states. The animation should feel natural, responsive, and enhance the user's understanding of the interface.
