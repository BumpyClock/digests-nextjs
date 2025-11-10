# Performance Monitoring Guide

This guide explains how to use the performance monitoring middleware integrated into the Zustand store.

## Overview

The performance monitoring middleware tracks state updates to help identify performance bottlenecks in development mode.

## Features

### State Update Performance Tracking

In development mode, all state updates are automatically monitored:

- Updates taking longer than 16ms (one frame at 60fps) are logged as warnings
- Each update shows the action performed and duration
- Enable detailed logging with `NEXT_PUBLIC_DEBUG_STORE=true`

## Environment Variables

- `NODE_ENV=development` - Enables performance monitoring
- `NEXT_PUBLIC_DEBUG_STORE=true` - Enables verbose store update logging

## Reading the Logs

### Slow Update Warning
```
[FeedStore] Slow update detected: 25.14ms
{
  action: { readItems: Set(5) },
  stateBefore: { ... },
  stateAfter: { ... },
  duration: "25.14ms"
}
```

## Best Practices

1. **Use in Development Only**: Performance monitoring is automatically disabled in production
2. **Watch for Slow Updates**: The 16ms threshold catches updates that might cause frame drops
3. **Enable Debug Mode**: Use `NEXT_PUBLIC_DEBUG_STORE=true` for detailed logging during development

## Identifying Issues

### Common Performance Problems

1. **Slow Updates**: State updates consistently taking >16ms
2. **Cascading Updates**: One update triggering multiple other updates

### Solutions

1. **Use Granular Selectors**: Subscribe only to the specific state you need
2. **Memoize Computed Values**: Use `useMemo` for expensive calculations
3. **Split Large Updates**: Break large state updates into smaller ones
4. **Optimize Selectors**: Use `useShallow` for object/array comparisons

## Example Usage

```typescript
// Before optimization
function FeedList() {
  const { feeds, items, readItems } = useFeedStore(); // Subscribes to entire store
  // Component re-renders on ANY state change
}

// After optimization
function FeedList() {
  const feeds = useFeeds(); // Granular selector
  const unreadCount = useUnreadCount(); // Computed selector
  // Component only re-renders when feeds or unread count changes
}
```

## Disabling in Production

Performance monitoring is automatically disabled in production builds. No configuration needed.