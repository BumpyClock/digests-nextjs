# CSS Inventory and Migration Risk (2026-02-17)

Read when:
- working on styling ownership decisions
- planning Tailwind/design-token migration work
- reviewing animation or prose styling migration scope

## Scope

Current CSS surfaces in the app at present are limited and mostly intentional:

- 4 files under `app/` for design system and generated primitives
- 2 component-scoped files for article reader and mobile feed transitions
- 1 vendored third-party syntax highlighting stylesheet in `public/`

## Inventory and classification

| File | Owner | Current role | Migration class | Rationale | Risk |
| --- | --- | --- | --- | --- | --- |
| `app/generated-design-tokens.css` | Design token pipeline (`lib/design-tokens.ts`, `scripts/generate-design-tokens-css.mjs`) | Generated root variables (`--font-*`, `--motion-*`, `--spacing-*`, etc.) | `KEEP` (generated source of truth) | Canonical contract for design values; should not be hand-edited. | Low |
| `app/generated-themes.css` | Theme system (`app` runtime + token generation outputs) | Generated theme variable definitions per `data-theme` mode | `KEEP` (generated source of truth) | Product-wide color/surface contract required by multiple route and component entry points. | Low |
| `app/globals.css` | App shell styling layer (`app/layout.tsx` imports) | Base token aliases, shared utility helpers, global compatibility helpers, motion utility classes | `KEEP`, with targeted simplification in place | Contains global compatibility and cross-cutting utility layer needed by many route/component entry points. | Medium |
| `app/typography.css` | App shell typography policy (`app/layout.tsx` imports) | Prose defaults and shared typography fallbacks for article-like content | `KEEP`, review after reader typography consolidation | Contains semantic prose and theme-dependent behavior that is broad in impact; no immediate extraction target. | Medium |
| `components/Feed/ArticleReader/ArticleReader.css` | `ArticleReader` surface owner | Scoped rich reader content styling (prose, blockquote, media sizing, citations, headings, etc.) | `RETAIN` (component scoped) | Highly content-specific selectors and cascade assumptions; migration would require broad render/structure refactor first. | Medium |
| `components/Feed/FeedMasterDetail/FeedMasterDetail.css` | `FeedMasterDetail` surface owner | Mobile layout/animation classes (`slide-*`, keyframes) and transition state styles | `RETAIN` (component scoped) with optional follow-up | Motion and reduced-motion semantics are localized and stateful; moving to global utilities could create coupling with unrelated surfaces. | Medium |
| `public/prism-tomorrow.css` | Vendor asset | Syntax highlighting styles for Prism code blocks | `RETAIN AS-VENDOR` | Third-party theme file; keep version-aligned and avoid inline drift. | Low |

## Decision notes

- Priority for migration work in this pass is to keep behavior stable and document ownership clearly.
- No CSS file shows a safe one-step migration path to global utility-only ownership without functional risk in this cycle.
- Any future migration should be incremental:
  1. Extract repeated local values into `app/globals.css` utility tokens
  2. Move stable component blocks into shared primitives only after render structure is locked
  3. Keep reduced-motion and theme-specific logic visible where behavior is defined
