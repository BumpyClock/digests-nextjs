# Architecture Boundaries And Refactor Rules

Read when:
- You create new files under `app/`, `components/`, `hooks/`, `services/`, `store/`, `lib/`, or `workers/`.
- You refactor duplicated logic and need ownership rules.
- You need state ownership rules between React Query and Zustand: `docs/state-ownership-react-query-vs-zustand.md`.
- You need CSS/motion implementation rules: `docs/css-motion-layering-policy.md`.

## Directory ownership
- `app/`: route entrypoints and route-local composition only. Avoid domain business logic here.
- `components/`: reusable UI. Domain components go in domain folders (for example `components/Feed/*`).
- `hooks/`: React hooks and query orchestration, including data-loading composition.
- `services/`: imperative integration boundaries (worker transport, API boundary adapters, lifecycle orchestration).
- `workers/`: isolated worker runtime handlers and message dispatch.
- `store/`: Zustand stores, slices, and canonical selectors (`store/selectors/*`).
- `lib/`: cross-domain pure utilities and external client wrappers.
- `types/`: shared contracts and DTOs used across layer boundaries.

## Layering constraints
- `app/` may depend on `components`, `hooks`, `store`, `types`, `lib`, `services`.
- `components/` may depend on `hooks`, `store`, `types`, `lib`, and narrowly scoped `services` facades.
- `hooks/` may depend on `store`, `types`, `lib`, `services`.
- `services/` may depend on `types`, `lib`, and worker contracts; do not import route or UI modules.
- `workers/` may depend on `types`, `lib`; do not import React, Next, or Zustand modules.
- `store/` may depend on `types` and `lib`; avoid `components` imports.

## State ownership boundary
- React Query owns server state.
- Zustand owns client-only state.
- Do not duplicate server collections into Zustand.

## Duplication prevention rules
- If logic is reused in 2 places, extract to shared helper/hook unless coupling would increase complexity.
- Keep feed parsing/network calls centralized in `lib/feed-pipeline/api-client.ts` (canonical export surface via `lib/feed-pipeline/index.ts`).
- Keep worker message contracts only in `types/worker-contracts.ts` and consume via aliases, not duplicate interfaces.
- Keep selector derivations in `store/selectors/*`; `hooks/*` should wrap selectors, not redefine them.
- Keep feed pipeline orchestration modules under `lib/feed-pipeline/*` and route worker/service imports there directly. See `docs/feed-pipeline-namespace-plan.md`.

## File size and organization
- Target files under ~500 LOC.
- When a file exceeds ~500 LOC or mixes concerns, split by concern:
  - presentation component
  - state/data hook
  - utility/helpers
  - types/contracts

## UI system rules (Tailwind-first + tokens)
- Prefer Tailwind utility composition for layout and spacing.
- Use design tokens for color, typography, spacing, radius, shadows, and motion timing.
- Avoid ad-hoc hardcoded durations/easing; consume motion tokens.
- Keep custom CSS for cases that are not expressible cleanly in Tailwind utilities.
- Follow `docs/css-motion-layering-policy.md` for implementation-level layering and reduced-motion behavior.

## Worker/service rules
- Worker initialization/config updates happen at app boundary (for example provider/initializer components).
- Service internals stay store-agnostic; pass config through explicit API.
- Retry/fallback behavior lives in shared clients (`lib/*`), not duplicated per caller.

## Test and verification rules
- Refactors that move shared contracts/selectors must run:
  - `bun run format:fix`
  - `bun run lint:fix`
  - `bunx tsc --noEmit`
  - `bun test ./tests`
- For migrations touching persisted state, also run `bun run check:migration`.

## Images module ownership

Image helpers are now grouped under `utils/images/*` with a canonical barrel export in `utils/images/index.ts`.
- Prefer `@/utils/images` as the default import surface.
- Prefer `@/utils/images/<module>` only for narrow, single-purpose imports.
- Keep image-specific exports in the images namespace; do not create new top-level `utils/image*.ts` entry files.
- See `docs/images-module-layout.md` before modifying image helpers.
