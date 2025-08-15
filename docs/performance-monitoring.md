# Performance Monitoring Guide

This guide explains how to use the performance monitoring tools integrated into the Zustand store.

## Overview

The performance monitoring middleware tracks state updates and component renders to help identify performance bottlenecks.

## Features

### 1. State Update Performance Tracking

In development mode, all state updates are automatically monitored:

- Updates taking longer than 16ms (one frame at 60fps) are logged as warnings
- Each update shows the action performed and duration
- Enable detailed logging with `NEXT_PUBLIC_DEBUG_STORE=true`

### 2. Component Render Counting

Track how many times components re-render:

```typescript
import { useRenderCount } from "@/store/middleware/performanceMiddleware";

function MyComponent() {
  // In development, logs render count to console
  useRenderCount('MyComponent');

  return <div>...</div>;
}
```

### 3. Performance Metrics Aggregation

The system automatically collects and aggregates performance metrics:

- Average, min, and max update times
- Metrics are logged every 30 seconds in development
- Access metrics programmatically:

```typescript
import { performanceMetrics } from "@/store/middleware/performanceMiddleware";

// Get stats for a specific metric
const stats = performanceMetrics.getStats("FeedStore");
console.log(stats); // { avg: "5.23", max: "25.14", min: "0.12", count: 100 }

// Log all metrics
performanceMetrics.logAllStats();
```

### 4. Subscription Debugging

Debug which components subscribe to which store parts:

```typescript
// Enable with NEXT_PUBLIC_DEBUG_SUBSCRIPTIONS=true
import { debugSubscription } from "@/store/middleware/performanceMiddleware";

function MyComponent() {
  const items = useFeedStore((state) => {
    debugSubscription("FeedStore", (state) => state.items, "MyComponent");
    return state.items;
  });
}
```

## Environment Variables

- `NODE_ENV=development` - Enables all performance monitoring
- `NEXT_PUBLIC_DEBUG_STORE=true` - Enables verbose store update logging
- `NEXT_PUBLIC_DEBUG_SUBSCRIPTIONS=true` - Enables subscription debugging

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

### Render Count Log

```
[Render] FeedCard-item-123 rendered 3 times
```

### Performance Metrics Summary

```
=== Performance Metrics ===
FeedStore: { avg: "5.23", max: "25.14", min: "0.12", count: 100 }
```

## Best Practices

1. **Use in Development Only**: Performance monitoring is automatically disabled in production
2. **Monitor Key Components**: Add render counting to components you suspect might be re-rendering too often
3. **Watch for Patterns**: Look for components that render on every state update
4. **Set Thresholds**: The 16ms threshold catches updates that might cause frame drops
5. **Regular Review**: Check the aggregated metrics periodically during development

## Identifying Issues

### Common Performance Problems

1. **Excessive Re-renders**: Components with high render counts that shouldn't update frequently
2. **Slow Updates**: State updates consistently taking >16ms
3. **Cascading Updates**: One update triggering multiple other updates

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
