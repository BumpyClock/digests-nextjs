# Coding Guidelines

This document outlines our code standards to ensure consistency and quality.

## Core Principles

- **CUPID**: Composable, Unix philosophy, Predictable, Idiomatic, Domain-based
- **DRY**: Avoid duplication through proper abstraction
- **Self-Documenting**: Code that explains itself through clear naming and structure

## Code Quality Practices

### Naming & Structure
- Use descriptive, intention-revealing names
- Use strong typing to provide context
- Extract complex conditions into well-named functions
- Break complex functions into smaller, focused ones
- Use enums and constants for magic values
- Write comments only for "why," not "what"

### Code Organization
```
app/              # Next.js App Router
components/       # Reusable UI components
  ui/             # Low-level UI components
  [domain]/       # Domain-specific components
hooks/            # Custom React hooks
lib/              # Utility functions
stores/           # Zustand stores
types/            # TypeScript definitions
services/         # API services and integrations
```

## TypeScript Guidelines
- Define proper types; avoid `any` (use `unknown` when necessary)
- Use interfaces for entities with identity
- Use type aliases for unions, intersections, and utility types
- Create centralized type definitions for shared types
- Use TypeScript's utility types when appropriate

## Component Design
- Create small, focused components with single responsibility
- Use composition over inheritance
- Follow atomic design principles
- Extract reusable logic into custom hooks
- Use Next.js Server and Client Components appropriately

## State Management (Zustand)
- Create separate stores for different domains
- Keep store logic simple and focused
- Implement selectors to access only needed state
- Consider middleware for logging, persistence, etc.

## Performance
- Use Next.js built-in optimizations
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize with proper key props and memoization
- Use incremental static regeneration for semi-dynamic content

## Error Handling
- Implement error boundaries around component trees
- Use try-catch for async operations
- Create standardized patterns for API requests
- Design meaningful error states
- Gracefully degrade functionality when errors occur

### Error Handling Example
```typescript
try {
  await saveData();
} catch (error) {
  console.error("Operation failed:", error);
  setErrorState({
    message: "Something went wrong while saving",
    severity: "warning",
    recoveryAction: () => retryOperation(),
  });
}
```

## Theming
- Use CSS variables for theme properties
- Support light/dark modes and color schemes
- Ensure accessibility with proper contrast ratios
- Use Tailwind's dark mode variant

## Documentation
- Add JSDoc comments to functions, components, and types
- Document complex logic and business rules
- Update documentation with significant changes

## Testing
- Write unit tests for utilities and hooks
- Implement component tests for UI components
- Add integration tests for major features
- Use Testing Library for component testing

## Accessibility
- Follow WCAG guidelines
- Use semantic HTML elements
- Implement proper keyboard navigation
- Add appropriate ARIA attributes
- Ensure sufficient color contrast

## CSS & Styling
- Use Tailwind utility classes
- Create custom components for repeated patterns
- Maintain consistency with ShadCN UI
- Implement responsive design

## Git Workflow
- Write meaningful commit messages
- Use feature branches for new development
- Keep PRs focused and reasonable in size
- Request code reviews for all changes

Remember: Code is meant to be read by humans. Prioritize clarity and maintainability over cleverness or brevity.