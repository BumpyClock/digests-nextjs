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
