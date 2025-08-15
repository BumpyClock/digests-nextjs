# API Service Tests

This directory contains comprehensive tests for the new API service layer that replaced the worker services.

## Test Structure

### Unit Tests

- `services/__tests__/api-service.test.ts` - Core API service functionality tests
  - Configuration management
  - Feed operations (CRUD)
  - Reader view fetching
  - Cache behavior
  - Error handling
  - Offline support

### Integration Tests

- `__tests__/integration/api-service-integration.test.tsx` - Full component integration tests
  - Feed fetching and display
  - Reader view loading
  - Error handling in UI
  - Cache behavior in real scenarios
  - Offline mode handling

### Performance Tests

- `__tests__/performance/api-service-performance.test.ts` - Performance verification
  - Verifies 4x performance improvement (250ms → 50ms)
  - Cache performance benefits
  - Multiple feed handling
  - Concurrent request performance
  - Memory efficiency
  - Real-world scenario benchmarks

## Running Tests

### All Tests

```bash
pnpm test
```

### Specific Test Suite

```bash
# Unit tests only
pnpm test services/__tests__/api-service.test.ts

# Integration tests only
pnpm test __tests__/integration/api-service-integration.test.tsx

# Performance tests only
pnpm test __tests__/performance/api-service-performance.test.ts
```

### Watch Mode

```bash
pnpm test:watch
```

### Coverage Report

```bash
pnpm test:coverage
```

## Test Coverage

The tests cover:

1. **API Operations**

   - Feed fetching and refreshing
   - Reader view extraction
   - Feed CRUD operations
   - Article management

2. **Performance**

   - Direct API calls complete within 50ms target
   - Cache hits return in under 5ms
   - 4x improvement over worker-based approach verified

3. **Error Scenarios**

   - HTTP error codes (400, 401, 403, 404, 429, 500, 503)
   - Network timeouts
   - Invalid JSON responses
   - Offline mode

4. **Cache Management**
   - TTL expiration
   - Cache invalidation on refresh
   - Cache clearing on API URL change

## Mock Setup

The tests use:

- MSW (Mock Service Worker) for API mocking
- Test factories for consistent mock data
- Jest for test runner and assertions

## Performance Results

Expected performance metrics:

- **Direct API calls**: ~50ms (excluding network)
- **Cached calls**: <5ms
- **Multiple feeds**: <10ms per feed
- **Reader view**: ~50ms
- **Error handling**: <10ms

The tests verify these targets are met consistently.

## Debugging Tests

To debug a specific test:

1. Add `console.log` statements in the test
2. Run with `--verbose` flag: `pnpm test -- --verbose`
3. Use `--no-coverage` to speed up test runs during debugging

## Adding New Tests

When adding new API functionality:

1. Add unit tests in `services/__tests__/api-service.test.ts`
2. Add integration tests if UI is affected
3. Update performance tests if performance characteristics change
4. Update MSW handlers in `test-utils/msw/handlers.ts` for new endpoints
