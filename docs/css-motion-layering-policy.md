# CSS And Motion Layering Policy

Read when:
- Adding or changing UI styles.
- Adding animations/transitions/easing.
- Choosing between component CSS, global CSS, and Tailwind utilities.

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

## Ownership

- Product-wide utility primitives: `app/globals.css`.
- Route/layout-level intent docs: `docs/route-tree-and-boundaries.md`.
- Component-specific exceptions: local CSS file adjacent to component.
