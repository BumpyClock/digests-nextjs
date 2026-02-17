# Dependency Health Review (2026-02-17)

Read when:
- You are considering replacing storage, masonry, syntax-highlighting, or custom scrollbar dependencies.
- You are making bundle-size or maintenance-risk decisions.

Scope: validate report item G3 from `reports/codebase-analysis-2026-02-16.md` with current maintenance/adoption data and project-specific migration impact.

## Data sources
- npm registry metadata and publish times:
  - https://registry.npmjs.org/localforage
  - https://registry.npmjs.org/masonic
  - https://registry.npmjs.org/prismjs
  - https://registry.npmjs.org/simplebar-react
- npm weekly downloads API:
  - https://api.npmjs.org/downloads/point/last-week/localforage
  - https://api.npmjs.org/downloads/point/last-week/masonic
  - https://api.npmjs.org/downloads/point/last-week/prismjs
  - https://api.npmjs.org/downloads/point/last-week/simplebar-react
- GitHub repository + releases API:
  - https://api.github.com/repos/localForage/localForage
  - https://api.github.com/repos/jaredLunde/masonic
  - https://api.github.com/repos/PrismJS/prism
  - https://api.github.com/repos/Grsmto/simplebar

Data checked on: 2026-02-17.

## Decisions

### localforage
Current signal:
- latest package: `1.10.0` (published 2021-08-18)
- npm modified: 2022-06-19
- weekly downloads: ~6.1M
- repo last push: 2024-07-30

Usage in this repo:
- Zustand persistence stores and React Query cache persistence rely on `localforage`.

Recommendation:
- Keep short-term, wrap medium-term.
- Keep now to avoid risky persistence migrations.
- Introduce a small storage adapter boundary (`getItem/setItem/removeItem`) so we can swap to `idb-keyval` or `idb` later with minimal code churn.

Migration effort if replaced now:
- medium (touches persisted data contracts and migration safety checks).

### masonic
Current signal:
- latest package: `4.1.0` (published 2025-04-22)
- weekly downloads: ~74K
- repo last push: 2026-01-31

Usage in this repo:
- `components/Feed/FeedGrid/FeedGrid.tsx` is the main dependency surface.

Recommendation:
- Keep.
- Existing feed grid behavior depends on mature masonry virtualization semantics already integrated.
- Replacing now with a custom `@tanstack/react-virtual` masonry composition would increase maintenance cost and UX regression risk.

Migration effort if replaced:
- medium-high (layout measurement, overscan tuning, scroll stability retesting).

### prismjs
Current signal:
- latest package: `1.30.0` (published 2025-03-10)
- weekly downloads: ~15.5M
- repo last push: 2026-02-14

Usage in this repo:
- App currently links a static theme CSS (`/prism-tomorrow.css`) from layout.

Recommendation:
- Keep for now; defer replacement.
- If we need server-rendered semantic highlighting, evaluate `shiki` as a scoped follow-up.
- No urgent maintenance pressure from current data.

Migration effort if replaced:
- low-medium depending on whether highlighting is runtime-only or moved to build/server pipeline.

### simplebar-react
Current signal:
- latest package: `3.3.2` (published 2025-07-03)
- weekly downloads: ~631K
- upstream simplebar repo last push: 2025-11-09

Usage in this repo:
- shared `ScrollArea` wrapper component centralizes usage.

Recommendation:
- Keep, but constrain usage behind the wrapper only.
- For simple surfaces, prefer native scroll + CSS tokens.
- Keep `simplebar-react` for custom overlay scrollbar behavior where design consistency matters.

Migration effort if replaced:
- low-medium (single wrapper abstraction lowers risk).

## Prioritized follow-up plan
1. Add storage adapter around `localforage` and route all persistence through it.
2. Keep `masonic`, `prismjs`, and `simplebar-react` at current major versions; review quarterly.
3. Create optional proof-of-concepts only when needed:
   - `idb-keyval` storage adapter spike.
   - `shiki` spike for markdown-heavy pages.
   - native-scroll fallback path in `ScrollArea` wrapper.
