# Enhanced API Client Usage Guide

The API service has been enhanced with robust retry logic, request cancellation, deduplication, circuit breaker pattern, and integrated security features. This guide explains how to use these new features with real-world examples from the Sprint 2 implementation.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Security Integration](#security-integration)
- [Type-Safe Responses](#type-safe-responses)
- [Retry Logic](#retry-logic)
- [Request Cancellation](#request-cancellation)
- [Request Deduplication](#request-deduplication)
- [Circuit Breaker](#circuit-breaker)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)
- [Real-World Examples](#real-world-examples)

## Basic Usage

The API service exposes a unified `request` method that handles all HTTP operations:

```typescript
import { apiService } from "@/services/api-service";

// Basic GET request
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
});

// POST request with body
const result = await apiService.request({
  url: "/api/feeds",
  method: "POST",
  body: { urls: ["https://example.com/feed.xml"] },
});
```

## Security Integration

The API service now includes built-in security features that automatically validate URLs and generate secure cache keys:

### URL Validation

All API URLs are automatically validated to prevent security issues:

```typescript
// This will throw an error if the URL is invalid or uses a blocked protocol
const data = await apiService.request({
  url: 'javascript:alert("XSS")', // Will be rejected
  method: "GET",
});

// Valid URLs pass through normally
const feeds = await apiService.request({
  url: "https://api.example.com/feeds",
  method: "GET",
});
```

### Secure Cache Keys

The API service uses SHA-256 hashing for cache keys to prevent collisions:

```typescript
// Long URLs are automatically hashed for safe caching
const longUrl = "https://api.example.com/feeds?" + "x".repeat(1000);
const data = await apiService.request({
  url: longUrl,
  method: "GET",
}); // Cache key will be a SHA-256 hash
```

### Feed URL Validation

When adding feeds, URLs are validated for security:

```typescript
import { validateFeedUrls } from "@/utils/security";

// Batch validation
const urls = [
  "https://example.com/feed.xml",
  "http://localhost/feed", // Will be rejected
  "https://192.168.1.1/feed", // Will be rejected
  "javascript:void(0)", // Will be rejected
];

const { valid, invalid } = validateFeedUrls(urls);
console.log("Valid feeds:", valid); // Only ['https://example.com/feed.xml']
console.log("Rejected:", invalid); // The rest
```

## Type-Safe Responses

The API service integrates with the type guard system for runtime validation:

### Basic Type Validation

```typescript
import { isFeed, isApiResponse } from "@/utils/type-guards";

// Type-safe feed fetching
const response = await apiService.request({
  url: "/api/feeds/123",
  method: "GET",
});

// Validate response structure
if (isApiResponse(response, isFeed)) {
  // response.data is now typed as Feed
  console.log("Feed title:", response.data.feedTitle);
} else {
  throw new Error("Invalid response format");
}
```

### Safe Parsing Pattern

```typescript
import { safeParse, isFeedItem } from "@/utils/type-guards";

// Handle potentially invalid data safely
const response = await apiService.request({
  url: "/api/feed-items",
  method: "GET",
});

const result = safeParse(response.data, isFeedItem, "FeedItem");
if (result.success) {
  // result.data is typed as FeedItem
  processFeedItem(result.data);
} else {
  // Handle validation error gracefully
  console.error("Validation failed:", result.error.message);
}
```

### Array Validation

```typescript
import { isArrayOf, isFeed } from "@/utils/type-guards";

// Validate array responses
const response = await apiService.request({
  url: "/api/feeds",
  method: "GET",
});

if (isArrayOf(response.data, isFeed)) {
  // response.data is typed as Feed[]
  response.data.forEach((feed) => {
    console.log(feed.feedTitle);
  });
}
```

## Retry Logic

### Default Retry Configuration

By default, requests will retry 3 times with exponential backoff:

```typescript
// Uses default retry config
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
}); // Will retry up to 3 times on failure
```

### Custom Retry Configuration

```typescript
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
  retry: {
    attempts: 5, // Number of retry attempts
    backoff: "exponential", // 'exponential' or 'linear'
    maxDelay: 60000, // Maximum delay between retries (60s)
    initialDelay: 500, // Initial delay (500ms)
    factor: 2, // Exponential factor (delay doubles each time)
  },
});
```

### Linear Backoff

For consistent delays between retries:

```typescript
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
  retry: {
    attempts: 3,
    backoff: "linear",
    maxDelay: 10000,
    initialDelay: 1000, // Will wait 1s between each retry
  },
});
```

### Custom Retry Condition

Control which errors trigger retries:

```typescript
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
  retry: {
    attempts: 3,
    backoff: "exponential",
    maxDelay: 30000,
    retryCondition: (error) => {
      // Only retry on specific status codes
      return error.status === 503 || error.status === 502;
    },
  },
});
```

## Request Cancellation

### Using AbortController

```typescript
const controller = new AbortController();

// Start request
const requestPromise = apiService.request({
  url: "/api/feeds",
  method: "GET",
  signal: controller.signal,
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const data = await requestPromise;
} catch (error) {
  if (error.code === "ABORTED") {
    console.log("Request was cancelled");
  }
}
```

### Using Request ID

```typescript
// Start request with custom ID
const requestPromise = apiService.request({
  url: "/api/feeds",
  method: "GET",
  requestId: "fetch-feeds-123",
});

// Cancel by ID from anywhere
apiService.cancel("fetch-feeds-123");
```

### Cancel All Requests

```typescript
// Cancel all pending requests
apiService.cancelAll();
```

## Request Deduplication

Identical concurrent requests are automatically deduplicated:

```typescript
// These three requests will result in only one API call
const promise1 = apiService.request({
  url: "/api/feeds",
  method: "POST",
  body: { urls: ["https://example.com"] },
});

const promise2 = apiService.request({
  url: "/api/feeds",
  method: "POST",
  body: { urls: ["https://example.com"] },
});

const promise3 = apiService.request({
  url: "/api/feeds",
  method: "POST",
  body: { urls: ["https://example.com"] },
});

// All promises resolve with the same result
const [result1, result2, result3] = await Promise.all([
  promise1,
  promise2,
  promise3,
]);
```

## Circuit Breaker

The circuit breaker automatically opens after repeated failures to prevent cascading errors:

### How it Works

1. **Closed State**: Requests flow normally
2. **Open State**: After 5 consecutive failures, requests fail immediately
3. **Half-Open State**: After 60 seconds, allows test requests through

### Configuration

The circuit breaker uses these defaults:

- Failure threshold: 5 consecutive failures
- Reset timeout: 60 seconds
- Tracks failures per endpoint

### Example Behavior

```typescript
// After 5 failures to /api/feeds, the circuit opens
for (let i = 0; i < 5; i++) {
  try {
    await apiService.request({ url: "/api/feeds", method: "GET" });
  } catch (error) {
    console.log(`Attempt ${i + 1} failed`);
  }
}

// 6th request fails immediately with CIRCUIT_BREAKER_OPEN
try {
  await apiService.request({ url: "/api/feeds", method: "GET" });
} catch (error) {
  if (error.code === "CIRCUIT_BREAKER_OPEN") {
    console.log("Circuit breaker is open");
  }
}

// Wait 60 seconds for circuit to enter half-open state
// Next request will be attempted
```

## Error Handling

### Error Types

All errors include enhanced information:

```typescript
interface ApiError {
  code: string; // Error code (e.g., 'NETWORK_ERROR', 'TIMEOUT')
  message: string; // Human-readable message
  status?: number; // HTTP status code if applicable
  attempts?: number; // Number of attempts made
  originalError?: Error; // Original error if wrapped
}
```

### Error Codes

- `NETWORK_ERROR`: Network-related failures
- `TIMEOUT`: Request timeout
- `HTTP_ERROR`: Non-2xx HTTP responses
- `ABORTED`: Request was cancelled
- `CIRCUIT_BREAKER_OPEN`: Circuit breaker is open
- `UNKNOWN`: Unknown error type

### Example Error Handling

```typescript
try {
  const data = await apiService.request({
    url: "/api/feeds",
    method: "GET",
    timeout: 5000,
  });
} catch (error) {
  if (isApiError(error)) {
    switch (error.code) {
      case "TIMEOUT":
        console.log("Request timed out after", error.attempts, "attempts");
        break;
      case "NETWORK_ERROR":
        console.log("Network error:", error.message);
        break;
      case "HTTP_ERROR":
        console.log("HTTP error:", error.status);
        break;
      case "CIRCUIT_BREAKER_OPEN":
        console.log("Service temporarily unavailable");
        break;
    }
  }
}
```

## Migration Guide

### From Direct fetch() Calls

Before:

```typescript
const response = await fetch("/api/feeds", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ urls }),
});
const data = await response.json();
```

After:

```typescript
const data = await apiService.request({
  url: "/api/feeds",
  method: "POST",
  body: { urls },
});
```

### From Legacy API Methods

The existing helper methods still work and now benefit from retry logic:

```typescript
// These methods now use the enhanced request method internally
const feeds = await apiService.feeds.getAll();
const feedItems = await apiService.feeds.refresh("feed-id");
const readerView = await apiService.fetchReaderView(
  "https://example.com/article",
);
```

### Adding Timeout

```typescript
// Add timeout to any request
const data = await apiService.request({
  url: "/api/feeds",
  method: "GET",
  timeout: 10000, // 10 second timeout
});
```

### Handling Component Unmount

```typescript
import { useEffect } from "react";

function MyComponent() {
  useEffect(() => {
    const controller = new AbortController();

    apiService
      .request({
        url: "/api/feeds",
        method: "GET",
        signal: controller.signal,
      })
      .then((data) => {
        // Handle data
      })
      .catch((error) => {
        if (error.code !== "ABORTED") {
          // Handle real errors
        }
      });

    // Cleanup: cancel request on unmount
    return () => controller.abort();
  }, []);
}
```

## Best Practices

1. **Always handle errors**: The retry logic handles transient failures, but permanent errors need handling
2. **Use request IDs** for important requests you may need to cancel
3. **Set appropriate timeouts** for user-facing operations
4. **Monitor circuit breaker state** in production for service health
5. **Use AbortController** for component cleanup to prevent memory leaks

## Performance Considerations

- Request deduplication reduces server load
- Circuit breaker prevents cascading failures
- Exponential backoff prevents thundering herd
- Proper cancellation prevents unnecessary processing

## TypeScript Support

All methods are fully typed with TypeScript:

```typescript
import type { RequestConfig, ApiError } from "@/types";

// Type-safe request configuration
const config: RequestConfig = {
  url: "/api/feeds",
  method: "POST",
  body: { urls: ["https://example.com"] },
  retry: {
    attempts: 5,
    backoff: "exponential",
    maxDelay: 60000,
  },
};

// Type-safe error handling
try {
  const data = await apiService.request<FeedResponse>(config);
} catch (error) {
  if (isApiError(error)) {
    // error is typed as ApiError
  }
}
```
