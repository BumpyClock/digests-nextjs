# Learnings

- 2026-02-07: `react-resizable-panels@4` breaks old shadcn wrapper names; use `Group`/`Separator` and shim legacy `direction` prop in `components/ui/resizable.tsx`.
- 2026-02-07: `@types/dompurify` is deprecated stub and breaks `scripts/pretest.js` raw `tsc` compile (TS2688); remove it from direct deps.
- 2026-02-07: Bun migration: set `packageManager`, replace `npm run` chaining in scripts with `bun run`, and keep docs/examples Bun-first to avoid mixed-manager drift. For Vercel production/runtime Next.js commands, use Bun runtime explicitly with `--bun` (for example `bun --bun next dev` and `bun --bun next build`); local dev can usually run plain `bun run` scripts.
- 2026-02-07: Bun migration, React Compiler guidance: before enabling compiler transforms, verify plugin/rule compatibility in the current Next.js/Bun toolchain (for example when upgrading Next major versions).
- 2026-02-07: Bun migration, Monorepo workspaces guidance: in workspace setups, add `@types/node` in the nearest package `node_modules` when TS can’t resolve Node globals during local package builds.
- 2026-02-07: Bun migration, Route groups guidance: validate route-group path collisions after folder moves (for example `(with-header)` vs `(no-header)` pages resolving to the same URL segment).
- 2026-02-07: `bun audit` transitive CVEs cleared by `overrides` (`lodash`, `lodash-es`, `mdast-util-to-hast`, `js-yaml`) without changing app runtime APIs.
- 2026-02-07: keep a single Prism theme source (`public/prism-tomorrow.css`) and reference it via `<link rel="stylesheet" href="/prism-tomorrow.css" />` from `app/layout.tsx`.
- 2026-02-07: root `app/layout.tsx` wrappers can unintentionally constrain nested app routes; use a pathname-aware shell (`/web` immersive mode) to remove inherited max-width/padding when full-screen UX is needed.
- 2026-02-07: `react-resizable-panels@4` treats numeric `defaultSize`/`minSize`/`maxSize` as pixels; use strings for percentage sizes (`"30%"`) in panel layouts.
- 2026-02-07: settings UX works best as shared tabs content reused in both `/web` modal dialog and `/web/settings` fallback page to avoid duplicated tab wiring/state bugs.
- 2026-02-07: View Transition API shared-element names must be CSS-safe; sanitize/hash feed IDs for `viewTransitionName`, and wrap state flips in `document.startViewTransition(() => flushSync(...))` for reliable snapshots in React.
- 2026-02-07: for `/web` header/no-header splits, keep `app/web/layout.tsx` server-only and use route groups (`(with-header)` / `(no-header)`) instead of `usePathname` in layout, so server rendering stays intact.
- 2026-02-07: TS-first design tokens only work if generated CSS variable names exactly match consumer names (`--motion-ease-*`, `--shadow-*`, `--z-*`, `--backdrop-blur-*`); keep generator output aligned with `tailwind.config.ts` fallback vars and regenerate after token key changes.
