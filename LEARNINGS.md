# Learnings

Durable repo learnings only. Evergreen. No dated incident logs.

## Architecture

- Single source of truth per concern: route/detail shells, query keys, worker message contracts.
- Keep feed query keys + URL normalization centralized (`hooks/queries/feedsKeys.ts`).
- Route cache invalidation/mutation through shared key/normalization helpers.
- Keep worker orchestration reusable + store-agnostic; shared timeout/retry/fallback flow.
- Worker lifecycle idempotent: safe repeated start/stop, explicit handler attach/detach.

## Routing and Layout

- Keep `app/web/layout.tsx` server-only.
- Use route groups for layout variants; avoid `usePathname`-driven branching in root layout.
- Validate route-group URL collisions after folder moves.
- Avoid root wrappers that constrain immersive/full-screen routes.

## UI and State

- View Transition IDs CSS-safe; sanitize/hash dynamic names.
- Transition state flips inside `document.startViewTransition(() => flushSync(...))` for stable snapshots.
- Shared-element transitions: small intentional element set; avoid over-animating metadata nodes.
- Reuse shared shells/content across modal/page variants to prevent behavior drift.
- Keep accessibility defaults: semantic headings, AA tap targets, `aria-live`/status semantics, decorative icons `aria-hidden`.
- Virtualized lists: avoid mount entrance animations on frequently remounted cards.
- Scroll-based suppression logic must subscribe to the same scroll source used by virtualization.

## Design Tokens

- Token variable names must stay consistent across generation output, globals, Tailwind config, component usage.
- Keep base tokens theme-agnostic; map semantic aliases in theme layer.
- Keep typography/fallback utilities token-driven.

## Tooling and Data Safety

- Use one package manager across scripts/docs.
- Remove obsolete `@types/*` stubs when upstream package ships types.
- For Tailwind v4 directives (`@config`, `@utility`), keep Stylelint at-rule allowlist aligned.
- In migration/persisted-state code, guard unknown legacy shapes before map/filter and clear invalid legacy keys safely.
- Keep dependency risk low: prefer maintained libraries, isolate replaceable deps behind adapters, review health periodically.

## Performance

- Prefer single-pass transforms; avoid repeated full-array scans in hot paths.
- Use `Set`/`Map` for dedup/lookups.
- Hoist invariant calculations out of per-item loops.
- Cache normalized search strings; avoid repeated normalization work.
- Derived counts must match the same filtered dataset used for rendering.
- Virtualize long lists; keep scroll-container behavior compatible with virtualization library.
- Worker cache keys deterministic (stable ordering + unambiguous serialization, e.g. `JSON.stringify`); include request correlation IDs on error responses.
- Guard idempotent state writes to prevent unnecessary re-renders/churn.
