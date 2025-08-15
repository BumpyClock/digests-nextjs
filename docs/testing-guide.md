# Testing Guide for Digests NextJS

## Overview

This project uses Jest and React Testing Library for unit and integration testing. The testing infrastructure has been set up to provide a solid foundation for ensuring code quality and preventing regressions.

## Getting Started

### Installation

First, install all dependencies:

```bash
pnpm install
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (recommended for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run legacy Node.js tests
pnpm test:legacy
```

## Test Structure

```
├── __tests__/                 # Integration tests
│   └── integration/
│       ├── offline-mode.test.tsx
│       └── api-error-handling.test.tsx
├── components/
│   └── Feed/
│       ├── FeedList/
│       │   └── __tests__/   # Component tests
│       └── ArticleReader/
│           └── __tests__/
└── test-utils/               # Test utilities
    ├── render.tsx            # Custom render with providers
    ├── factories.ts          # Mock data factories
    ├── helpers.ts            # Test helper functions
    └── msw/                  # Mock Service Worker setup
        ├── handlers.ts       # API mock handlers
        └── server.ts         # MSW server setup
```

## Writing Tests

### Component Tests

```typescript
import { render, screen } from '@/test-utils/render';
import { createMockFeedItems } from '@/test-utils/factories';
import { createUser } from '@/test-utils/helpers';

describe('MyComponent', () => {
  it('renders correctly', async () => {
    const user = createUser();
    const mockData = createMockFeedItems(3);

    render(<MyComponent items={mockData} />);

    // Assert content is rendered
    expect(screen.getByText('Expected Text')).toBeInTheDocument();

    // Simulate user interaction
    const button = screen.getByRole('button');
    await user.click(button);

    // Assert behavior
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { render, screen, waitFor } from '@/test-utils/render';
import { mockFetch } from '@/test-utils/helpers';

describe('API Integration', () => {
  it('handles API errors gracefully', async () => {
    // Mock API response
    mockFetch({}, { ok: false, status: 500 });

    render(<MyFeature />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });
});
```

## Test Utilities

### Custom Render

The custom render function includes all necessary providers:

```typescript
import { render } from "@/test-utils/render";

// Automatically wraps component with:
// - QueryClientProvider
// - ThemeProvider
// - Any other global providers
```

### Mock Data Factories

Use factories to create consistent test data:

```typescript
import {
  createMockFeed,
  createMockFeedItem,
  createMockArticle,
  createMockFeeds,
  createMockFeedItems,
} from "@/test-utils/factories";

// Single item
const feed = createMockFeed({ title: "Custom Title" });

// Multiple items
const feeds = createMockFeeds(5);
const items = createMockFeedItems(10, "feed-id");
```

### Test Helpers

Common helper functions:

```typescript
import {
  createUser, // Create user event instance
  waitForLoadingToFinish, // Wait for loading states
  mockLocalStorage, // Mock localStorage
  mockFetch, // Mock fetch responses
  checkAccessibility, // Basic a11y checks
} from "@/test-utils/helpers";
```

## Mock Service Worker (MSW)

MSW is set up but currently commented out. To enable:

1. Uncomment the import in `jest.setup.ts`:

   ```typescript
   import "./test-utils/msw/server";
   ```

2. Use in tests:

   ```typescript
   import { server } from "@/test-utils/msw/server";
   import { errorHandlers } from "@/test-utils/msw/handlers";

   it("handles errors", () => {
     server.use(errorHandlers.feeds);
     // ... test error handling
   });
   ```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Wait for Async Operations**: Use `waitFor` for async updates
4. **Mock External Dependencies**: Mock API calls, localStorage, etc.
5. **Keep Tests Isolated**: Each test should be independent
6. **Use Descriptive Names**: Test names should clearly describe what they test

## Common Patterns

### Testing Loading States

```typescript
it('shows loading state', () => {
  render(<Component isLoading={true} />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('displays error message', async () => {
  mockFetch({}, { ok: false });
  render(<Component />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Error');
  });
});
```

### Testing Form Submissions

```typescript
it('submits form data', async () => {
  const user = createUser();
  const onSubmit = jest.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

## Debugging Tests

1. **Use `screen.debug()`**: Print the current DOM
2. **Check Test IDs**: Use `screen.logTestingPlaygroundURL()`
3. **Step Through**: Use debugger statements
4. **Verbose Output**: Run with `--verbose` flag

## Coverage

Run coverage report:

```bash
pnpm test:coverage
```

Coverage goals:

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Common Issues

1. **"Cannot find module"**: Check import paths and aliases
2. **"Not wrapped in act(...)"**: Use `waitFor` for async updates
3. **"Unable to find element"**: Element may not be rendered yet
4. **Test timeouts**: Increase timeout or check for infinite loops

### Getting Help

1. Check existing tests for examples
2. Refer to React Testing Library docs
3. Use ESLint and TypeScript for catching errors
4. Ask team members for code review

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW Documentation](https://mswjs.io/docs/)
