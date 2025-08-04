# ADR-001: Remove Worker Services

**Date**: 2025-07-26  
**Status**: Implemented  
**Decision**: Remove all worker services and use direct API calls

## Context

The Digests NextJS application was using Web Workers for all API calls, based on the assumption that offloading network requests to worker threads would improve performance. Performance analysis revealed:

- Worker services added 200-250ms latency to every API call
- Message serialization/deserialization overhead was significant
- No CPU-intensive operations were being performed
- Memory usage increased by ~20MB due to worker threads
- Debugging was complicated by indirect call stacks

## Decision

We will remove all worker services and replace them with direct fetch API calls from the main thread.

## Rationale

### Performance Data
```
Measurement: API call to fetch feeds
- With Worker: 250ms average (200-300ms range)
- Direct Call: 50ms average (40-60ms range)
- Improvement: 80% reduction in latency
```

### Why Workers Were Unnecessary
1. **Network I/O is already async**: The fetch API is non-blocking
2. **No heavy computation**: Workers excel at CPU-intensive tasks, not network calls
3. **Overhead exceeds benefit**: Message passing overhead > any potential benefit
4. **Browser optimization**: Modern browsers already optimize network requests

### Benefits of Direct Calls
- **Performance**: 4x faster API responses
- **Simplicity**: Direct call stacks, easier debugging
- **Memory**: ~20MB reduction in memory usage
- **Maintainability**: Less code, fewer abstractions
- **Error Handling**: Direct error propagation

## Implementation

### Before (Worker Pattern)
```javascript
// api-worker.js
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'FETCH_FEEDS':
      const response = await fetch('/api/feeds');
      const data = await response.json();
      self.postMessage({ type: 'FEEDS_LOADED', data });
      break;
  }
});

// Component
const worker = new Worker('/workers/api-worker.js');
worker.postMessage({ type: 'FETCH_FEEDS' });
worker.onmessage = (e) => setFeeds(e.data);
```

### After (Direct Pattern)
```typescript
// api-service.ts
export const apiService = {
  async fetchFeeds(): Promise<Feed[]> {
    const response = await fetch('/api/feeds');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
};

// Component
useEffect(() => {
  apiService.fetchFeeds()
    .then(setFeeds)
    .catch(handleError);
}, []);
```

## Consequences

### Positive
- ✅ 80% reduction in API latency
- ✅ 20MB reduction in memory usage
- ✅ Simplified debugging and error handling
- ✅ Reduced code complexity
- ✅ Better TypeScript support
- ✅ Easier testing with standard mocking

### Negative
- ❌ None identified - workers were purely detrimental for this use case

### Neutral
- 🔄 Main thread handles network calls (already async, no blocking)
- 🔄 Pattern change requires updating all API calls

## Lessons Learned

1. **Measure before optimizing**: The worker "optimization" was never benchmarked
2. **Understand the tool**: Workers are for CPU-intensive tasks, not I/O
3. **Complexity has a cost**: Every abstraction must justify its existence
4. **Simple often wins**: Direct solutions often outperform clever ones

## References

- [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [When to use Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#when_to_use_workers)
- Sprint 1 Performance Analysis (internal)

## Review

**Reviewed by**: Engineering Team  
**Review Date**: 2025-07-26  
**Approval**: Unanimous - performance data speaks for itself