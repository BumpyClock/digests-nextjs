# ADR-003: Testing Framework Selection

**Date**: 2025-07-26  
**Status**: Implemented  
**Decision**: Use Jest with React Testing Library and MSW for testing

## Context

The application had no test infrastructure, making refactoring risky and regressions likely. We needed to establish a testing foundation that would:
- Support React component testing
- Enable API mocking without brittle implementations
- Provide good developer experience
- Integrate well with our toolchain

## Decision

We selected the following testing stack:
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing focused on user behavior
- **MSW (Mock Service Worker)**: API mocking at the network level
- **Testing Library Jest DOM**: Additional DOM assertions

## Rationale

### Why Jest?
1. **Next.js Integration**: First-class support in Next.js
2. **Performance**: Fast parallel test execution
3. **Features**: Built-in mocking, coverage, watch mode
4. **Ecosystem**: Vast ecosystem of extensions and utilities
5. **Developer Experience**: Excellent error messages and debugging

### Why React Testing Library?
1. **Philosophy**: Tests user behavior, not implementation
2. **Maintainability**: Tests don't break with refactoring
3. **Accessibility**: Encourages accessible selectors
4. **Official**: Recommended by React team

### Why MSW?
1. **Network-Level Mocking**: Intercepts actual fetch requests
2. **Realistic**: Same handlers work in tests and development
3. **Type Safety**: Request/response types stay in sync
4. **No Implementation Details**: Components remain unaware of mocking

### Example Implementation

```typescript
// MSW Handler
export const handlers = [
  rest.get('/api/feeds', (req, res, ctx) => {
    return res(ctx.json(mockFeeds));
  }),
];

// Component Test
it('should display feeds after loading', async () => {
  renderWithProviders(<FeedList />);
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  await waitFor(() => {
    mockFeeds.forEach(feed => {
      expect(screen.getByText(feed.title)).toBeInTheDocument();
    });
  });
});
```

## Alternatives Considered

### Vitest
- ✅ Faster than Jest
- ✅ Better ESM support
- ❌ Less mature ecosystem
- ❌ Requires more configuration with Next.js

### Cypress/Playwright (only)
- ✅ Real browser testing
- ❌ Slower execution
- ❌ Not suitable for unit tests
- Decision: Use for E2E tests in addition to Jest

### Enzyme
- ❌ Encourages testing implementation details
- ❌ Poor React 18+ support
- ❌ Maintenance mode

## Implementation Details

### Test Structure
```
__tests__/
├── components/
│   ├── FeedList.test.tsx
│   └── ArticleReader.test.tsx
├── integration/
│   ├── offline-mode.test.tsx
│   └── api-error-handling.test.tsx
└── utils/
    └── api-service.test.ts
```

### Test Utilities Created
1. **Custom Render**: Wraps components with providers
2. **Mock Factories**: Generate test data consistently
3. **API Handlers**: Reusable MSW request handlers
4. **Test Helpers**: Common assertions and utilities

## Consequences

### Positive
- ✅ Caught 3 regressions during worker service removal
- ✅ Confidence for future refactoring
- ✅ Documentation through tests
- ✅ Better code design (testability forces good patterns)
- ✅ Fast feedback loop (< 5s for unit tests)

### Negative
- ❌ Initial setup time investment
- ❌ Learning curve for team members new to RTL
- ❌ Requires discipline to maintain coverage

### Neutral
- 🔄 Need to establish coverage targets
- 🔄 Must balance unit vs integration tests
- 🔄 CI/CD pipeline updates required

## Success Metrics

| Metric | Target | Current |
|--------|---------|---------|
| Test Coverage | 80%+ | Foundation ready |
| Test Execution Time | < 30s | ~5s |
| Flaky Test Rate | < 1% | 0% |
| Developer Satisfaction | High | TBD |

## Best Practices Established

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good
   expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled();
   
   // Bad
   expect(component.state.isSubmitEnabled).toBe(true);
   ```

2. **Use Testing Library Queries**
   - Prefer: `getByRole`, `getByLabelText`, `getByText`
   - Avoid: `getByTestId`, `querySelector`

3. **Mock at the Right Level**
   - API calls: MSW handlers
   - External modules: Jest mocks
   - Time/Random: Jest utilities

4. **Keep Tests Independent**
   - Each test should be runnable in isolation
   - Clean up after each test
   - No shared state between tests

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Review

**Reviewed by**: Engineering Team  
**Review Date**: 2025-07-26  
**Approval**: Implemented successfully