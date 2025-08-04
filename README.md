# Digests

Digests is an open-source RSS reader built with Next.js. It lets you subscribe to feeds and read articles in a clean interface that works offline.

## Features

- Subscribe to and manage RSS feeds
- Search across feeds and articles
- Mark items as read or save them for later
- Offline-first Progressive Web App (PWA)
- Customizable themes
- Fast and responsive (50ms API response time)

## Prerequisites

- Node.js 18 or later
- [pnpm](https://pnpm.io/) package manager

## Setup

### Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Generate theme CSS variables:
   ```bash
   pnpm generate:themes
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Setup (Optional)

For error monitoring with Sentry, create a `.env.local` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your_org_name
SENTRY_PROJECT=your_project_name
```

## Development Commands

### Build and Run

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start
```

### Code Quality

```bash
# Run TypeScript type checking
pnpm type-check
# or
tsc --noEmit

# Run ESLint
pnpm lint

# Run ESLint and fix issues
pnpm lint:fix

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Project Structure

- `app/` – Next.js app router files, layout, and global styles
- `components/` – Reusable UI components
- `store/` – Zustand stores for UI state management
- `services/` – API service layer and utilities
- `types/` – TypeScript type definitions
- `test-utils/` – Testing utilities and mock factories
- `__tests__/` – Test files organized by feature

## Generating themes

Run `pnpm generate:themes` whenever theme colors change. This script outputs `app/generated-themes.css`, which the application imports at startup. Theme colors are defined in `lib/theme-definitions.ts`.

## Deployment

Build and start the app with:

```bash
pnpm build
pnpm start
```

You can also deploy to platforms like Vercel using their standard Next.js workflow.

## Architecture

### State Management

- **Server State**: Moving to React Query (TanStack Query) for caching and persistence
- **UI State**: Zustand for client-side UI state
- **Error Monitoring**: Sentry integration for production error tracking

### Performance

- Direct API calls with 50ms response time (4x improvement from previous architecture)
- TypeScript for type safety and better developer experience
- Comprehensive test coverage with Jest and React Testing Library

## Testing

The project uses Jest and React Testing Library for testing. Test files are located in `__tests__/` directories throughout the codebase.

```bash
# Run all tests
pnpm test

# Run tests for a specific file or pattern
pnpm test FeedList

# Generate coverage report
pnpm test:coverage
```

For more details on testing patterns and utilities, see `.claude/docs/testing-guide.md`.

## Toast notifications

The custom `useToast` hook automatically removes dismissed toasts after five
seconds. You can adjust this delay by editing `TOAST_REMOVE_DELAY` in
`hooks/use-toast.ts`.

## Contributing

Before contributing, please ensure:

1. All TypeScript errors are resolved (`pnpm type-check`)
2. ESLint passes (`pnpm lint`)
3. Tests pass (`pnpm test`)
4. New features include appropriate tests

## Recent Improvements (Sprint 1)

- ✅ Removed worker service anti-pattern (80% API performance improvement)
- ✅ Set up comprehensive error monitoring with Sentry
- ✅ Established testing infrastructure with Jest and React Testing Library
- ✅ Fixed critical TypeScript errors and enabled strict type checking
- 🚧 Migrating to React Query for better state management (Sprint 2)

For detailed architectural decisions and migration patterns, see:

- `.claude/docs/architecture-comparison.md`
- `.claude/docs/adr/` - Architecture Decision Records
