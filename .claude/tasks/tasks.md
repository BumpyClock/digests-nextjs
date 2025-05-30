# Zustand Store Refactoring Tasks

## Phase 1: Setup Slices Structure
- [x] Create store/slices directory
- [x] Create store/slices/feedSlice.ts with feeds array and feed-related actions
- [x] Create store/slices/itemsSlice.ts with feedItems array and sorting functions
- [x] Create store/slices/readStatusSlice.ts with readItems and readLaterItems Sets
- [x] Create store/slices/metadataSlice.ts with loading states and metadata
- [x] Move existing store methods to appropriate slices
- [x] Update imports in slice files to reference get() for cross-slice access
- [x] Combine all slices in store/useFeedStore.ts using spread operator
- [x] Test that all existing functionality still works after slice refactoring
- [x] Commit changes with message "refactor: organize store into slices"

## Phase 2: Create Selector Hooks
- [x] Create hooks/useFeedSelectors.ts file
- [x] Implement useIsItemRead selector that returns boolean for specific item ID
- [x] Implement useIsInReadLater selector that returns boolean for specific item ID
- [x] Implement useReadActions selector with shallow equality for action functions
- [x] Implement useReadLaterActions selector with shallow equality
- [x] Implement useUnreadCount computed selector
- [x] Implement useFeedItemsByFeed selector with shallow equality
- [x] Implement useActiveFeedItems selector for active feed filtering
- [x] Add JSDoc comments to each selector explaining usage
- [x] Export all selectors from hooks/useFeedSelectors.ts

## Phase 3: Migrate FeedCard Component
- [x] Backup current FeedCard component implementation
- [x] Replace readItems subscription with useIsItemRead selector
- [x] Replace isInReadLater check with useIsInReadLater selector
- [x] Replace action imports with useReadActions and useReadLaterActions
- [x] Remove useMemo for isRead calculation (no longer needed)
- [x] Test FeedCard still displays read/unread status correctly
- [x] Test mark as read functionality works
- [x] Test read later functionality works
- [x] Verify component only re-renders when its specific item changes
- [x] Commit changes with message "perf: optimize FeedCard with granular subscriptions"

## Phase 4: Migrate Other High-Impact Components
- [x] Update CommandBar to use useUnreadCount selector
- [x] Update CommandBar to use feed titles selector instead of full feeds array
- [x] Migrate FeedGrid to use optimized selectors
- [ ] Migrate FeedList to use optimized selectors
- [x] Update web/page.tsx to use computed selectors for filtered items
- [x] Update SettingsFeedCard to use granular subscriptions (no store usage, skipped)
- [ ] Test each component after migration
- [ ] Ensure no visual regressions in UI
- [ ] Verify improved performance in React DevTools Profiler

## Phase 5: Add Performance Monitoring
- [ ] Create store/middleware/performanceMiddleware.ts
- [ ] Implement performance timing for state updates
- [ ] Add console warnings for updates taking longer than 16ms
- [ ] Apply middleware to development builds only
- [ ] Add render counting to FeedCard in development
- [ ] Document how to use performance monitoring
- [ ] Test performance monitoring shows expected output
- [ ] Identify any remaining performance bottlenecks

## Phase 6: Optimize Remaining Components
- [ ] Audit all components using useFeedStore directly
- [ ] Create additional granular selectors as needed
- [ ] Replace direct store access with appropriate selectors
- [ ] Add React.memo to components that receive stable props
- [ ] Implement subscription debugging in development mode
- [ ] Test all feed operations (add, remove, refresh)
- [ ] Test persistence and hydration still work correctly
- [ ] Verify client-side only behavior is maintained

## Phase 7: Documentation and Cleanup
- [ ] Update store documentation with new slice structure
- [ ] Document all available selectors in hooks/useFeedSelectors.ts
- [ ] Add examples of proper selector usage
- [ ] Remove any commented-out old code
- [ ] Update CLAUDE.md with new store patterns
- [ ] Create a performance optimization guide
- [ ] Add notes about when to use granular vs regular subscriptions
- [ ] Final testing of all functionality
- [ ] Create PR with comprehensive description of changes

## Phase 8: Future Considerations (Optional)
- [ ] Evaluate if store splitting is needed based on performance metrics
- [ ] Consider implementing separate stores for truly independent data
- [ ] Add TypeScript types for better type inference in selectors
- [ ] Implement store devtools for debugging
- [ ] Consider adding immer for immutable updates if needed
- [ ] Evaluate adding computed values cache
- [ ] Plan migration strategy for any remaining performance issues