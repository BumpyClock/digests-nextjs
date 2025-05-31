# Connected Animation Implementation Tasks

## Context Brief

### Overview
We're implementing smooth, connected animations between FeedCard components and their detail modals (ReaderViewModal/PodcastDetailsModal) using the motion library (formerly framer-motion). The goal is to create a seamless visual transition where clicking a feed card causes its elements to smoothly expand and morph into the modal view.

### Current State
- **Existing**: Position tracking via `getBoundingClientRect()`, Radix UI Dialog modals, BaseModal wrapper, shared elements (thumbnail, title, metadata)
- **Missing**: No shared element transitions, basic zoom animations only, position data underutilized, no exit animations

### Implementation Approach
1. **Shared Layout Animations**: Using motion's `layoutId` to connect elements between card and modal states
2. **Progressive Enhancement**: Feature flag (`NEXT_PUBLIC_ENABLE_ANIMATIONS`) for gradual rollout
3. **Animation Timeline**: Click → Press (100ms) → Morph (300ms) → Content Fade (200ms) = 600ms total
4. **Key Elements to Animate**:
   - Primary (shared): Thumbnail/artwork, title, site metadata (favicon + name)
   - Secondary (fade/slide): Article content, action buttons, scroll areas

### Technical Strategy
- Create motion-enhanced versions alongside existing components (non-breaking)
- Use AnimatePresence for enter/exit animations
- Implement spring physics for natural motion
- Respect prefers-reduced-motion for accessibility
- Optimize for 60fps performance using GPU-accelerated properties

### Expected Outcome
A delightful interaction where feed cards smoothly transform into their detail views, creating a clear visual connection that enhances user understanding of the interface hierarchy.

## Setup Phase
- [x] Install motion library using `pnpm add motion`
- [x] Create `.env` variable `NEXT_PUBLIC_ENABLE_ANIMATIONS` for feature flag
- [x] Add motion library to project dependencies in package.json
- [x] Create `contexts` folder in project root if it doesn't exist
- [x] Create `utils/animation-config.ts` file for animation configurations
- [ ] Add motion imports to relevant component files

## Animation Context
- [x] Create `contexts/FeedAnimationContext.tsx` file
- [x] Define AnimationState interface with activeItemId, isAnimating, and animationSource
- [x] Implement FeedAnimationProvider component with state management
- [x] Add reduced motion preference detection in context
- [x] Export useFeedAnimation custom hook
- [x] Wrap app with FeedAnimationProvider in root layout
- [x] Add MotionConfig with reducedMotion setting

## Motion Components - FeedCard
- [x] Create `components/Feed/FeedCard/MotionFeedCard.tsx` file (Updated existing FeedCard instead)
- [x] Import motion and AnimatePresence from motion library
- [x] Add layoutId to card container element
- [x] Add layoutId to thumbnail image element
- [x] Add layoutId to title element
- [x] Add layoutId to metadata container
- [x] Add layoutId to favicon image
- [x] Add layoutId to site title text
- [x] Implement whileHover animation for card lift effect
- [x] Implement whileTap animation for card press effect
- [x] Add spring transition configuration for card animations
- [x] Create exit animations for card-only elements
- [x] Connect setActiveItemId to card click handler

## Motion Components - BaseModal
- [x] Create `components/MotionBaseModal.tsx` file (Updated existing BaseModal instead)
- [x] Import Dialog components from Radix UI
- [x] Wrap Dialog.Portal with AnimatePresence
- [x] Add forceMount prop to Dialog.Portal and Dialog.Overlay
- [x] Create motion.div wrapper for Dialog.Overlay with fade animation
- [x] Create motion.div wrapper for Dialog.Content with scale animation
- [x] Add exit animations for modal closing
- [x] Implement handleClose with animation delay
- [x] Add layoutId to modal container matching card container

## Motion Components - ReaderViewModal
- [x] Create `components/MotionReaderViewModal.tsx` file (Updated existing components instead)
- [x] Import MotionBaseModal component (BaseModal already has motion support)
- [x] Add layoutId to thumbnail container matching FeedCard
- [x] Add layoutId to thumbnail image matching FeedCard
- [x] Add layoutId to metadata container matching FeedCard
- [x] Add layoutId to favicon matching FeedCard
- [x] Add layoutId to site title matching FeedCard
- [x] Add layoutId to article title matching FeedCard
- [x] Create contentVariants for staggered animations
- [x] Add motion wrapper for article content with fade-in animation
- [ ] Add motion wrapper for action buttons with slide-up animation
- [ ] Implement staggerChildren for sequential animations

## Motion Components - PodcastDetailsModal
- [ ] Create `components/MotionPodcastDetailsModal.tsx` file
- [ ] Use different layoutId prefix for podcast items
- [ ] Add layoutId for podcast artwork
- [ ] Add layoutId for podcast title
- [ ] Add layoutId for podcast metadata
- [ ] Add layoutId for play button element
- [ ] Implement podcast-specific animations
- [ ] Add motion wrapper for podcast description
- [ ] Add motion wrapper for episode list

## Animation Configurations
- [x] Define springConfig object with gentle, snappy, and smooth presets
- [x] Create fadeInUp animation variant
- [x] Create scaleIn animation variant
- [x] Create slideInFromBottom animation variant
- [x] Define modalVariants with hidden and visible states
- [x] Set up default transition timings
- [x] Configure GPU-accelerated properties list

## Integration - Update Existing Components
- [ ] Update FeedCard to conditionally use MotionFeedCard based on feature flag
- [ ] Update BaseModal to conditionally use MotionBaseModal
- [ ] Update ReaderViewModal to use MotionReaderViewModal
- [ ] Update PodcastDetailsModal to use MotionPodcastDetailsModal
- [ ] Add activeItemId tracking to existing click handlers
- [ ] Integrate animation context with existing modal state

## ScrollArea Integration
- [ ] Wrap ScrollArea content with motion.div
- [ ] Add opacity animation to ScrollArea content
- [ ] Add delay to ScrollArea animation
- [ ] Implement scroll position preservation
- [ ] Test scroll behavior during animations

## Progressive Image Integration
- [ ] Wrap ProgressiveImage with motion.div container
- [ ] Add layoutId to image container
- [ ] Ensure image animations work with progressive loading
- [ ] Test image transitions with different loading states

## Performance Optimizations
- [ ] Create trackAnimationPerformance utility function
- [ ] Add animation duration logging in development
- [ ] Implement 600ms threshold warning
- [ ] Add will-change CSS property to animated elements
- [ ] Implement lazy loading for motion components
- [ ] Create mobile-specific animation simplifications
- [ ] Add useReducedMotion hook implementation

## Gesture Controls
- [ ] Add swipe-to-close gesture for mobile modals
- [ ] Implement drag constraints for modal dismissal
- [ ] Add drag elastic configuration
- [ ] Test gesture controls on touch devices

## Testing Implementation
- [ ] Create test file for rapid open/close scenarios
- [ ] Test keyboard navigation with animations
- [ ] Test with prefers-reduced-motion enabled
- [ ] Test on mobile devices for performance
- [ ] Test with slow network conditions
- [ ] Test exit animations on ESC key press
- [ ] Test animations at different viewport sizes
- [ ] Test with long scrollable content
- [ ] Test with missing or broken images
- [ ] Test z-index layering during animations

## Polish and Fine-tuning
- [ ] Adjust spring stiffness values for natural motion
- [ ] Fine-tune damping values for smooth stops
- [ ] Optimize animation durations for each element
- [ ] Add subtle scale animations to interactive elements
- [ ] Implement loading state animations
- [ ] Create error state animations
- [ ] Add micro-interactions for hover states

## Documentation
- [ ] Document animation timing guidelines
- [ ] Create animation component usage examples
- [ ] Document layoutId naming conventions
- [ ] Add performance optimization notes
- [ ] Create troubleshooting guide for common issues
- [ ] Document accessibility considerations

## Cleanup and Deployment
- [ ] Remove console logs from production build
- [ ] Test feature flag toggle functionality
- [ ] Verify backward compatibility without animations
- [ ] Run performance profiling on animations
- [ ] Update component documentation
- [ ] Create migration guide for team members