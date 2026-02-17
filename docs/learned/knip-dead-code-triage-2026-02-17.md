# Dead-code triage report (knip) — 2026-02-17

Command: `bunx knip`  
Generated from: `reports/knip-dead-code-2026-02-17.json`  
Scope: `digests-nextjs` workspace

## 1) Files marked unused by knip

### Safe remove (confirmed)
- `scripts/codex-beads-loop.ts`  
  - No runtime imports/uses found. Appears to be an old local agent helper.
- `components/Feed/FeedCard/FeedCardBase.tsx`  
  - Duplicate `FeedCardBase` implementation exists in `components/Feed/shared/FeedCardBase.tsx`, which is the one imported by `FeedCard` and settings card usage.
- `components/ui/frosted-glass.tsx`  
  - No import references found in codebase.
- `app/web/(no-header)/settings/hooks/index.ts`  
  - Re-exports hooks already imported directly at call sites (`use-feed-form`, `use-feed-management`, `use-opml`) and has no direct consumers.

### Keep (intended framework/route/static assets)
- `public/prism-tomorrow.css`  
  - Referenced from `app/layout.tsx` via `/prism-tomorrow.css`.
- `public/sw.js`  
  - Referenced by service worker registration in `components/worker-init.tsx`.
- `app/pages/privacy-policy.mdx`
- `app/pages/why-digests.mdx`  
  - Both are linked from `app/page.tsx` and are still valid route content.

### Keep (test scope, not dead)
- `components/CommandBar/__tests__/CommandBar.test.tsx`
- `hooks/queries/__tests__/use-feeds-data.test.tsx`
- `hooks/queries/__tests__/use-reader-view-query.test.tsx`  
  - Marked unused in knip’s default analysis, but these are test files and currently not imported in runtime code.

## 2) Unused package findings

- `package.json` unused deps: `@mdx-js/react`, `@next/mdx`, `@testing-library/react`, `lottie-react`, `prismjs`.
- `jest.setup.dts` unlisted: `@testing-library/jest-dom`, `jest` (test tooling context).
- `postcss.config.mjs` unlisted: `postcss-load-config` (build-time usage only).

## 3) Unused exported symbols (investigate)

knip produced many unused export/type candidates across:
- UI component files (e.g., `components/ui/*`, many optional shadcn exports)
- pipeline and utility modules
- worker service surface

These are likely false positives or acceptable API surface for flexibility; they are not removed in this bead.

## 4) Next bead handoff

- `digests-nextjs-12.2` (safe removals only) should take the confirmed safe-remove list from above.
- Other flagged symbols are triaged to **investigate** because they may represent:
  - index-export intent
  - dynamic/indirect usage
  - test-only or UI-API boundary exports
