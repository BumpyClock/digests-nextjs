# Sentry & TypeScript Integration Patterns

## Overview

This document captures the complex type patterns and solutions discovered during the Sentry v9 and TypeScript maintenance work for Sprint 2 Day 2.

## Key Discoveries

### 1. Sentry v9 Replay Integration Import Pattern

**Issue**: The `replayIntegration` function is not exported from `@sentry/nextjs` in v9.42.0.

**Solution**: Import from `@sentry/react` instead:

```typescript
// ❌ Incorrect - replayIntegration not available
import * as Sentry from "@sentry/nextjs";
// Sentry.replayIntegration(...) // This will fail

// ✅ Correct - import from @sentry/react
import * as Sentry from "@sentry/nextjs";
import { replayIntegration } from "@sentry/react";

Sentry.init({
  integrations: [
    replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 2. Conflicting ApiError Type Pattern

**Issue**: Multiple `ApiError` interfaces exist in the codebase with different structures:

- `types/common.ts`: Simple error with code, message, details
- `types/api-client.ts`: Extended Error class with status, retry, attempts

**Solution**: Use type aliasing in barrel exports to avoid conflicts:

```typescript
// types/index.ts
// Export specific types to avoid conflicts
export {
  type ApiClient,
  type RequestConfig,
  // ... other exports
  type ApiError as ApiClientError, // Rename to avoid conflict
} from "./api-client";

// In consuming files
import type { ApiClientError as ApiError } from "@/types";
```

### 3. TypeScript Isolated Modules Pattern

**Issue**: When `isolatedModules` is enabled, re-exporting types requires explicit `type` keyword.

**Solution**: Use `type` keyword for type-only exports:

```typescript
// ❌ Will error with isolatedModules
export { ApiClient } from "./api-client";

// ✅ Correct
export { type ApiClient } from "./api-client";
```

### 4. Type Guard Naming Conflicts

**Issue**: Imported type guards can conflict with local implementations.

**Solution**: Rename local functions to avoid conflicts:

```typescript
// When importing isApiError from types
import { isApiError } from "@/types";

// Rename local implementation
function isApiErrorType(error: unknown): error is ApiError {
  return error instanceof Error && "code" in error;
}
```

### 5. Sentry v9 API Changes

**Notable changes from v8 to v9**:

- `Sentry.startTransaction()` → Use performance monitoring via configuration
- `client.getIntegrations()` → Not available in v9
- Replay integration must be imported from `@sentry/react`

## TypeScript Strict Mode Compliance

The project maintains **zero TypeScript errors** in the main codebase with:

- `strict: true` in tsconfig.json
- `isolatedModules: true` for better module isolation
- Explicit type imports/exports
- Proper error type hierarchies

## Persistence Library Status

The `lib/persistence` directory contains 7 TypeScript errors that are lower priority:

- Missing adapter property in config
- Readonly array assignment issues
- Async/sync type mismatches

These are isolated and don't affect the main application.

## Best Practices

1. **Always run type checks** after integrations: `npx tsc --noEmit`
2. **Use type imports** for better tree-shaking: `import type { ... }`
3. **Test Sentry features** after configuration changes
4. **Document type patterns** when they're non-obvious
5. **Maintain type safety** at integration boundaries
