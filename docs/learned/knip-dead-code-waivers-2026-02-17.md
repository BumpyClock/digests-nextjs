# Dead-code waiver register (knip) — 2026-02-17

This register documents intentional keeps and likely false positives from
`reports/knip-dead-code-2026-02-17.json`.

## Keepers and why they remain

- `public/prism-tomorrow.css` — route/runtime stylesheet used by `app/layout.tsx` for Prism highlighting.
- `public/sw.js` — service worker entrypoint required by registration in `components/worker-init.tsx`.
- `app/pages/privacy-policy.mdx` — content route entry required by `app/page.tsx`.
- `app/pages/why-digests.mdx` — content route entry required by `app/page.tsx`.
- `components/CommandBar/__tests__/CommandBar.test.tsx` — test artifact excluded by default knip runtime analysis.
- `hooks/queries/__tests__/use-feeds-data.test.tsx` — test artifact excluded by default knip runtime analysis.
- `hooks/queries/__tests__/use-reader-view-query.test.tsx` — test artifact excluded by default knip runtime analysis.

## Files confirmed dead (still keep as explicit deletion targets)

- `scripts/codex-beads-loop.ts` — removed in `digests-nextjs-04s.12.2`.
- `components/Feed/FeedCard/FeedCardBase.tsx` — duplicate implementation retained in `components/Feed/shared/FeedCardBase.tsx`.
- `components/ui/frosted-glass.tsx` — no active references, now removed in `digests-nextjs-04s.12.2`.
- `app/web/(no-header)/settings/hooks/index.ts` — re-export barrel removed in `digests-nextjs-04s.12.2`.

## Potential false positives to defer (investigation backlog)

- `components/ui/*` exported symbol candidates.
- optional pipeline/worker surface exports flagged by knip from shared contract modules.
- package-level exported members that are consumed indirectly by tooling/build/test paths.

Notes:
- These remain for follow-up and should only be revisited when ownership or public API assumptions change.
