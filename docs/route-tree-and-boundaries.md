# Route Tree And Boundary Rules

Read when:
- You add or move routes under `app/`.
- You are unsure whether code belongs in `app/web` or `app/pages`.
- You add selectors or error boundaries.
- You need style and motion layering rules: `docs/css-motion-layering-policy.md`.
- You need architecture ownership and refactor rules: `docs/architecture-boundaries-and-refactor-rules.md`.

## Route intent

- `app/web`: authenticated product application surfaces (reader, settings, podcast/article details).
- `app/pages`: marketing/content/documentation-style routes (landing pages, MDX-like pages, policies).

## Placement rules

- Product workflows, feed interactions, and player logic go under `app/web`.
- Marketing, legal, and content pages go under `app/pages`.
- Keep `app/pages` path as-is for now. Do not rename/move to route-groups until explicit migration work is scheduled.

## Error boundary policy

Hybrid strategy (baseline + local containment):

- Route-level baseline:
- `app/web/error.tsx` provides fail-safe fallback for app routes.
- `app/pages/error.tsx` provides fail-safe fallback for content routes.

- Component-level containment:
- Keep local boundaries around high-risk widgets (virtualized grids, heavy async widgets, markdown/rendering surfaces) to avoid taking down entire route trees.

## Selector ownership

- Canonical pure selectors: `store/selectors/feed-selectors.ts`.
- Hook wrappers: `hooks/useFeedSelectors.ts` only.
- Avoid adding new selector logic under `utils/`.
