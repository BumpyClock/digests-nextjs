# Dead-code waiver register (knip) — 2026-02-17

Dead-code scan report used as baseline:
- `docs/learned/knip-dead-code-triage-2026-02-17.md`

## Why this register exists

Knip does not expose build-time, route-entry, or test-only imports in all contexts. This register explicitly tracks:
- intentional keeps
- likely false positives
- known deletion targets already completed in this cycle

## Keepers (intentional)

| Path | Why kept | Review notes |
| --- | --- | --- |
| `public/prism-tomorrow.css` | Runtime stylesheet referenced in `app/layout.tsx` (`/prism-tomorrow.css`). | Keep until Prism integration changes. |
| `public/sw.js` | Service worker entrypoint used by registration in `components/worker-init.tsx`. | Keep while `WorkerService` depends on `sw.js` registration lifecycle. |
| `app/pages/privacy-policy.mdx` | Content route surfaced by `app/page.tsx`. | Keep while content pages remain active. |
| `app/pages/why-digests.mdx` | Content route surfaced by `app/page.tsx`. | Keep while content pages remain active. |
| `components/CommandBar/__tests__/CommandBar.test.tsx` | Test artifact excluded by knip runtime scan defaults. | Test-only scope. |
| `hooks/queries/__tests__/use-feeds-data.test.tsx` | Test artifact excluded by knip runtime scan defaults. | Test-only scope. |
| `hooks/queries/__tests__/use-reader-view-query.test.tsx` | Test artifact excluded by knip runtime scan defaults. | Test-only scope. |

## Confirmed dead (executed removes)

| Path | Status | Evidence |
| --- | --- | --- |
| `scripts/codex-beads-loop.ts` | Removed | `digests-nextjs-04s.12.2` |
| `components/Feed/FeedCard/FeedCardBase.tsx` | Removed | Duplicate implementation in shared component path. |
| `components/ui/frosted-glass.tsx` | Removed | `digests-nextjs-04s.12.2` |
| `app/web/(no-header)/settings/hooks/index.ts` | Removed | Barrel re-export consolidation in `digests-nextjs-04s.12.2` |

## Deferred candidates

- `components/ui/*` symbol-level exports: retain as API surface for flexibility.
- Optional worker/pipeline exports surfaced by shared contract modules; verify on module-boundary changes.
- Package-level export members used indirectly by tooling/build/test paths.

Notes:
- Review this list on the next dead-code bead, especially when module boundaries or route entry assumptions change.
