# Learnings

Durable repo learnings only. Keep evergreen; drop incident logs.

## Build and Toolchain

- Use one package manager across scripts/docs. Avoid mixed-manager drift.
- Remove deprecated `@types/*` stubs when packages ship their own types; stubs can break raw `tsc` runs.
- Keep `scripts/pretest.js` on isolated TS compiles: temp tsconfig with explicit `files` + `include: []`; separate util compile pass when path layout depends on `rootDir`.
- Run token generation before app build so generated CSS never goes stale.

## Routing and Layout

- Keep `app/web/layout.tsx` server-only; use route groups for header/no-header variants, not `usePathname` in layout.
- Validate route-group URL collisions after folder moves.
- Do not let root layout wrappers unintentionally constrain immersive/full-screen routes.

## UI State and Transitions

- View Transition names must be CSS-safe; sanitize/hash dynamic IDs.
- Wrap transition-bound state flips in `document.startViewTransition(() => flushSync(...))` for reliable snapshots.
- Shared-element transitions work best with a small shared set (shell/title/thumbnail), not every metadata node.
- Reuse one settings-tabs content implementation across modal and fallback page to prevent state drift.

## Design Tokens

- Generated CSS variable names must match all consumers (`globals.css`, Tailwind config, component vars).
- Keep token CSS theme-agnostic; map semantic aliases at the theme layer.
- Keep Tailwind fallback utilities token-driven (`fontFamily`, `fontWeight`, typography scale, display sizes).

## Tooling and Linting

- For Tailwind CSS v4 files with `@config`/`@utility`, add Stylelint `at-rule-no-unknown` allowlist entries so CSS at-rule parsing stays compatible without rewriting hook usage.
- In migration logic, always guard legacy persisted collections with `Array.isArray(...)` before `.filter/.map`; if invalid, log and clear stale legacy keys to avoid runtime errors and bad rehydration state.
- For worker cache keys, normalize URL arrays with deterministic ordering and unambiguous serialization (eg `JSON.stringify`) rather than delimiter-joined keys to avoid false collisions.
- React Compiler currently skips/flags `try/finally` in component paths; keep async control flow in plain `try/catch` plus explicit cleanup calls.
- React Compiler flags synchronous `setState` inside effects; prefer event/callback updates, render-time derivation, or hydration-safe primitives (`useSyncExternalStore`) for mount gating.

## Performance Patterns

- Prefer single-pass/linear transforms over repeated full-array scans.
- Use `Set`/`Map` for dedup and hot-path lookups.
- Hoist feed-level fallback calculations out of per-item loops.
- Cache normalized strings in search paths; avoid repeated `.toLowerCase()` and expensive joins.
- Derived counts must come from the same filtered source used by UI output.
- Virtualize long lists and align scroll-container behavior with virtualization library expectations.
- Use request-id correlation plus response/content caching on worker boundaries to stabilize concurrent responses.
- Guard idempotent state writes (for example read-marking) to prevent unnecessary churn.
- Ensure worker cache keys are deterministic for full URL lists and include requestId on ERROR worker responses for better cross-thread correlation.

## Migration Guardrails

- When `biome check .` fails, update formatter/lint config, fix import ordering, JSX layout, duplicate props, and utility/store formatting together to restore formatting and lint conformance consistently.
- Migration guardrails that use regex search should include narrow, file+line-scoped allowlists for intentional legacy cleanup paths to avoid false positives without weakening enforcement.

## PR 56 Feedback Response (2026-02-16)

- Fixed review-findings with high confidence: normalized mojibake regexes, URL case handling in feed normalization, deterministic reader cache key hashing, stylelint at-rule allowlist, OPML warning flow, markdown content className pass-through, and Logger-based errors in rss worker.
- Kept additional low-impact style/heuristic findings as deferred notes unless explicitly prioritized.
- Added a quick validation pass: `bun run check:migration`, `bun run lint`, `node --test tests/feed-cache-merge.test.js`.

## Architecture Audit (2026-02-17)

- Keep one source of truth per concern: route/detail shells, feed query-key derivation, and worker transport contracts should each live in shared modules instead of per-view duplication.
- Do not keep committed compiled test artifacts (compiled-tests) as a second source of truth; prefer TS-native test execution or ephemeral compile output.
- Keep worker/request orchestration reusable and store-agnostic: inject config at boundaries, centralize request/timeout/fallback handling, and share message/response types.
- Prefer domain-driven component folders (layout, eed, podcast, udio, shared) with extracted shell primitives/hooks to reduce UI drift.

- When validating older architecture reports, classify each finding as confirmed/partial/stale against current code before creating tasks; avoid duplicate epics by adding scoped child beads to the active architecture epic.
