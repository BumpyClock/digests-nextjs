# Design Tokens

read_when: touching token source-of-truth, CSS var generation, global layout imports

## Scope

- Non-color foundation tokens only
- Categories: typography, motion, radius, elevation, z-index, blur, spacing

## Source Of Truth

- `lib/design-tokens.ts`
- Helpers in `lib/token-helpers.ts`

## Generation

- Command: `bun run generate:design-tokens`
- Script: `scripts/generate-design-tokens-css.mjs`
- Output: `app/generated-design-tokens.css`
- Output format: flattened CSS vars in `:root`

## Notes

- Keep token keys CSS-variable-safe (no dots/spaces)
- Keep generator deterministic; preserve object key order
- Keep generated file committed
- Keep naming parity with consumers:
  - `motion.ease.*` => `--motion-ease-*`
  - `shadow.*` => `--shadow-*`
  - `z.*` => `--z-*`
  - `backdropBlur.*` => `--backdrop-blur-*`
- Audit pass for `components/` + `components/ui/` complete:
  - removed `transition-all`
  - removed invalid `text-md` / `font-regular`
  - replaced arbitrary `rounded-[...]` in shared components with token-backed radius classes
  - only intentional bespoke values should remain

## Semantic Text Layer

- Added semantic typography tokens in `lib/design-tokens.ts`:
  - `typography.bodySmall`, `body`, `bodyLarge`, `subtitle`, `title`, `titleLarge`, `caption`, `label`, `overline`, `code`
- Generated CSS now includes `--typography-*-*` variables in `app/generated-design-tokens.css`
- Added semantic text role aliases in `app/globals.css`:
  - `--text-color-primary`, `secondary`, `tertiary`, `link`, `primary-on-accent`, `secondary-on-accent`
- Added utility classes in `app/globals.css`:
  - Typography: `.text-body-small`, `.text-body`, `.text-body-large`, `.text-subtitle`, `.text-title`, `.text-title-large`, `.text-caption`, `.text-label`, `.text-overline`, `.text-code`
  - Color: `.text-primary-content`, `.text-secondary-content`, `.text-tertiary-content`, `.text-primary-on-accent`, `.text-secondary-on-accent`, `.text-link-content`
- `app/typography.css` now consumes semantic text tokens instead of raw theme color vars where possible.
- `tailwind.config.ts` now maps `fontFamily` and `fontWeight` to token variables, so legacy utilities (`font-medium`, `font-semibold`, `font-mono`, etc.) still resolve through token source-of-truth.
