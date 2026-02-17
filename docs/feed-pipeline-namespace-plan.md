# Feed pipeline namespace and migration plan

## Goal
Bring parser/fetch/transform/validate/feed-fetch orchestration under a single coherent namespace so feed-related concerns are discoverable from one place.

## Status
- Migration completed on 2026-02-17.
- Temporary compatibility shims were not retained; all feed orchestration imports now use `lib/feed-pipeline/*` and worker/service imports were fully migrated.
- Legacy moved files are removed; canonical namespace API is `lib/feed-pipeline/index.ts`.

## Target namespace
- `lib/feed-pipeline/` owns pipeline code and contracts.
- `workers/` and `services/` remain entrypoints/orchestrators and import from the namespace.

## Current -> target mapping

| Current file | Target file | Responsibility |
| --- | --- | --- |
| `lib/feed-api-client.ts` | `lib/feed-pipeline/api-client.ts` | HTTP API calls + URL normalization + response contract handling |
| `lib/rss.ts` | `lib/feed-pipeline/feeds/fetcher.ts` | Feed fetcher adapter for reader/feeds use cases |
| `lib/feed-fetcher.ts` | `lib/feed-pipeline/feeds/http-fetcher.ts` | `IFeedFetcher` implementation + factory |
| `lib/interfaces/feed-fetcher.interface.ts` | `lib/feed-pipeline/contracts/fetcher.interface.ts` | Fetcher interface + config contract |
| `lib/feed-transformer.ts` | `lib/feed-pipeline/feeds/transformer.ts` | API response normalization/transforms |
| `utils/feed-validator.ts` | `lib/feed-pipeline/feeds/validator.ts` | Feed validation helpers |
| `types/worker-contracts.ts` | `types/worker-contracts.ts` | No move (`types/` remains cross-layer contract boundary) |
| `services/worker-service/service.ts` | `services/worker-service/service.ts` | Update imports only |
| `workers/rss-worker.ts` | `workers/rss-worker.ts` | Update imports only |
| `lib/feed-api-client.test` (none currently) | `tests/feed-pipeline/*` | Add when test migration starts |

## Proposed canonical exports

Create `lib/feed-pipeline/index.ts` with explicit public exports to avoid deep import leakage.

```ts
export { createFeedFetcher } from "./feeds/http-fetcher";
export { fetchFeeds, fetchReaderView } from "./feeds/fetcher";
export { transformFeedResponse } from "./feeds/transformer";
export { fetchParseFeeds, fetchReaderViewData } from "./api-client";
export { FeedValidator, feedValidator } from "./feeds/validator";
export type { FeedFetcherConfig, IFeedFetcher } from "./contracts/fetcher.interface";
```

## Migration sequence (completed)

1. Create namespace scaffolding
   - Add new directories under `lib/feed-pipeline/`.
   - Add `index.ts` barrel.
   - Directly migrate imports to namespace entrypoints in the same pass (no temporary shims retained).

2. Move shared contracts first
   - Move `lib/interfaces/feed-fetcher.interface.ts`.
   - Update direct contract consumers (`services/worker-service/service.ts`) to consume the namespace contract path.

3. Move data API client and transformation
   - Move `lib/feed-api-client.ts` into namespace and update imports from:
     - `workers/rss-worker.ts` (currently imports only API fetchers)
   - Move `lib/feed-transformer.ts` into namespace and replace internal path references.

4. Move fetcher façade/factory
   - Move `lib/feed-fetcher.ts` into namespace and adapt imports to namespace paths.
   - Ensure `IFeedFetcher` dependency resolves through contract module.

5. Move validation helper
   - Move `utils/feed-validator.ts` into namespace and update any current/new usage.
   - Verify no compatibility shim remains at the old path.

6. Update orchestrators
   - Update `services/worker-service/service.ts` and `workers/rss-worker.ts` imports to namespace index.
   - Confirm no `lib/*` boundary imports bypass namespace for feed orchestration.

7. Verify and finalize
   - Confirm no compatibility shims remain and no code relies on old path.
   - Update docs: `docs/architecture-boundaries-and-refactor-rules.md` with new canonical namespace note.
   - Add checklist entry for manual smoke tests:
     - RSS feed list refresh path works
     - Reader view fetch path works
     - Cache TTL and API base URL passthrough still works

## Suggested acceptance checks
- All feed pipeline orchestration imports resolve from `lib/feed-pipeline/*`.
- Worker layer (`workers/rss-worker.ts`) still depends only on `types`, `lib`, and standard utilities.
- No direct dependency from worker/service into removed old paths (`lib/feed-api-client.ts`, `lib/rss.ts`, `lib/feed-fetcher.ts`, `lib/interfaces/feed-fetcher.interface.ts`, `lib/feed-transformer.ts`, `utils/feed-validator.ts`).
- No feed pipeline code lives outside the namespace except docs/tests and worker entrypoints.
