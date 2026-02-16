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

## Tooling

- When `biome check .` fails, update formatter/lint config, fix import ordering, JSX layout, duplicate props, and utility/store formatting together to restore formatting and lint conformance consistently.
- Migration guardrails that use regex search should include narrow, file+line-scoped allowlists for intentional legacy cleanup paths to avoid false positives without weakening enforcement.
