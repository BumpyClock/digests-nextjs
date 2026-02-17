# CSS And Motion Layering Policy

Read when:
- Adding or changing UI styles.
- Adding animations/transitions/easing.
- Choosing between component CSS, global CSS, and Tailwind utilities.
- Working on refactors tracked in `digests-nextjs-6qd.12*`.

Related docs:
- `docs/route-tree-and-boundaries.md` (route intent + where this policy applies).
- `docs/architecture-boundaries-and-refactor-rules.md` (module ownership + refactor rules).

## Layering order

1. Design tokens (`generated-design-tokens.css`, `generated-themes.css`) define primitive and semantic values.
2. Tailwind utility classes are the default implementation path for component styles.
3. `@utility` helpers in `app/globals.css` are for cross-cutting token-backed patterns (`transition-token-*`, typography/content classes).
4. Component CSS files are only for scoped needs that cannot be expressed cleanly with utilities (complex keyframes, rich prose scopes, browser quirks).

## Rules

- Prefer token-backed classes/variables over hard-coded values.
- Use motion token variables for durations/easing:
- `var(--motion-duration-fast|normal|slow|slower)`
- `var(--motion-ease-standard|decelerate|accelerate|emphasized)`
- Always provide reduced-motion fallbacks for animated surfaces (`@media (prefers-reduced-motion: reduce)`).
- Keep shared styling primitives in reusable components or utility classes instead of duplicating in route/component CSS files.
- Remove unused component CSS files once equivalent utility-driven styling exists.

## Practical checks

- Prefer semantic token utility classes first; do not introduce arbitrary Tailwind values when an existing token alias matches the need.
- If animation is decorative, disable it in reduced-motion mode instead of only reducing duration.
- If animation communicates state change, keep the state change but shorten/simplify motion for reduced-motion mode.
- If the same transition values appear in 2 or more components, extract to a shared utility/token-backed class in `app/globals.css`.

## Ownership

- Product-wide utility primitives: `app/globals.css`.
- Route/layout-level intent docs: `docs/route-tree-and-boundaries.md`.
- Component-specific exceptions: local CSS file adjacent to component.
