# ADR-002: Adopt React Query with Persistence for State Management

**Date**: 2025-07-26  
**Status**: Proposed (Sprint 2)  
**Decision**: Use React Query with persistence for all server state management

## Context

The current application suffers from triple state management:
1. **Zustand stores**: Mixing server and UI state
2. **localStorage**: Duplicating server state for "persistence"
3. **sessionStorage**: Additional duplication for session data

This has resulted in:
- Memory usage of ~150MB (target: ~50MB)
- Complex synchronization logic
- Stale data issues
- No proper cache invalidation
- Poor offline support despite being a "PWA"

## Decision

We will adopt React Query (TanStack Query) with persistence plugins to manage all server state, keeping Zustand only for UI state.

## Rationale

### Current Problems

```typescript
// Current anti-pattern
const useFeedStore = create((set) => ({
  feeds: [],        // Server state - doesn't belong here
  isLoading: false, // UI state - belongs here
  filter: 'all',    // UI state - belongs here
  
  fetchFeeds: async () => {
    const feeds = await apiService.fetchFeeds();
    set({ feeds });
    localStorage.setItem('feeds', JSON.stringify(feeds)); // Duplicate
    sessionStorage.setItem('feeds', JSON.stringify(feeds)); // Triplicate!
  }
}));
```

### Benefits of React Query

1. **Built-in Caching**: Intelligent cache management with TTL
2. **Background Refetching**: Keeps data fresh automatically
3. **Offline Support**: First-class offline capabilities
4. **Optimistic Updates**: Better UX for mutations
5. **Request Deduplication**: Prevents redundant API calls
6. **Memory Efficient**: Single source of truth

### Persistence Strategy

```typescript
// Proposed implementation
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  serialize: (data) => compress(JSON.stringify(data)), // Optional compression
  deserialize: (data) => JSON.parse(decompress(data)),
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});
```

## Implementation Plan

### Phase 1: Setup (Sprint 2, Week 1)
```typescript
// 1. Install dependencies
// pnpm add @tanstack/react-query @tanstack/react-query-persist-client

// 2. Configure Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

// 3. Set up persistence
const persister = createIDBPersister(); // IndexedDB for large data
```

### Phase 2: Migration (Sprint 2, Week 2)

**Before (Zustand + localStorage)**:
```typescript
// Component
const { feeds, isLoading, fetchFeeds } = useFeedStore();

useEffect(() => {
  fetchFeeds();
}, []);

// Store
const useFeedStore = create((set) => ({
  feeds: JSON.parse(localStorage.getItem('feeds') || '[]'),
  fetchFeeds: async () => {
    const feeds = await api.fetchFeeds();
    set({ feeds });
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }
}));
```

**After (React Query)**:
```typescript
// Component
const { data: feeds, isLoading } = useQuery({
  queryKey: ['feeds'],
  queryFn: apiService.fetchFeeds,
});

// That's it! Caching, persistence, and refetching handled automatically
```

### Phase 3: Advanced Features

```typescript
// Optimistic updates
const mutation = useMutation({
  mutationFn: apiService.updateFeed,
  onMutate: async (newFeed) => {
    await queryClient.cancelQueries({ queryKey: ['feeds'] });
    const previousFeeds = queryClient.getQueryData(['feeds']);
    
    queryClient.setQueryData(['feeds'], (old) => 
      old.map(feed => feed.id === newFeed.id ? newFeed : feed)
    );
    
    return { previousFeeds };
  },
  onError: (err, newFeed, context) => {
    queryClient.setQueryData(['feeds'], context.previousFeeds);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['feeds'] });
  },
});
```

## State Separation Strategy

### Server State (React Query)
- Feeds data
- Articles content
- User preferences (from API)
- Search results
- Any data from external APIs

### UI State (Zustand)
- Modal open/closed
- Selected filters
- Form input values
- Sidebar collapsed/expanded
- Theme selection

## Consequences

### Positive
- ✅ 60%+ memory reduction expected
- ✅ Automatic cache management
- ✅ True offline support for PWA
- ✅ Simplified component logic
- ✅ Built-in loading/error states
- ✅ Reduced boilerplate code

### Negative
- ❌ New library to learn (mitigated by excellent docs)
- ❌ Migration effort required
- ❌ Different mental model from current approach

### Neutral
- 🔄 Requires careful planning of cache keys
- 🔄 Need to define cache invalidation strategies
- 🔄 Performance monitoring needed

## Migration Strategy

1. **Week 1**: Set up React Query infrastructure
2. **Week 2**: Migrate one feature completely (Feeds)
3. **Week 3**: Migrate remaining features
4. **Week 4**: Remove old state management code

## Success Metrics

| Metric | Current | Target |
|--------|---------|---------|
| Memory Usage | ~150MB | ~50MB |
| State Sync Code | ~500 lines | ~50 lines |
| Offline Support | Partial | Complete |
| Cache Hit Rate | 0% | >80% |

## Alternatives Considered

1. **SWR**: Similar features but React Query has better persistence support
2. **Redux + RTK Query**: Too heavy for our needs
3. **Keep Current**: Technical debt too high

## References

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Query Persistence](https://tanstack.com/query/latest/docs/react/plugins/persistQueryClient)
- [State Management Best Practices](https://tkdodo.eu/blog/practical-react-query)

## Review

**Reviewed by**: Pending Sprint 2 Planning  
**Review Date**: TBD  
**Approval**: Pending