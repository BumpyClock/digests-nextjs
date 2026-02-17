# State Ownership: React Query vs Zustand

Read when:
- You add or refactor feed/article data-loading code.
- You are deciding whether data belongs in React Query or Zustand.
- You are touching `hooks/queries/*` and `store/*` in the same change.

## Decision

- React Query owns server state.
- Zustand owns client state.

This is a hard boundary for feed and reader flows.

## Ownership matrix

- React Query (server state):
  - Feed fetch results and pagination windows
  - Reader view/article content fetched from APIs/workers
  - Network status, staleness, retries, background refetch

- Zustand (client state):
  - UI preferences and local toggles
  - Audio player state and playback controls
  - Local read-status metadata and optimistic UI markers
  - API endpoint/user-config inputs

## Rules

1. Do not copy server payloads from React Query into Zustand as a second cache.
2. Components should consume server data from query hooks directly.
3. Zustand slices may store only IDs/flags needed for UI behavior, not full server collections.
4. Cache invalidation for server data must happen through query keys/helpers.

## Anti-patterns to avoid

- `fetch -> setStore(fullServerPayload)` synchronization.
- Persisting full feed-item collections in Zustand.
- Reading server collections from Zustand when a query hook exists.

## Migration guardrails

1. Introduce/extend query hooks first.
2. Migrate consumers to query hooks.
3. Remove old store sync writes.
4. Keep selectors for client-only state in `store/selectors/*`.
5. Validate with:
   - `bun run format:fix`
   - `bun run lint:fix`
   - `bunx tsc --noEmit`
   - `bun test ./tests`

