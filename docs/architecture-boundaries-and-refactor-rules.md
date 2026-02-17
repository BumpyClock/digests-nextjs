# Architecture Boundaries And Refactor Rules

Read when:
- You create new files under `app/`, `components/`, `hooks/`, `services/`, `store/`, `lib/`, or `workers/`.
- You refactor duplicated logic and need ownership rules.
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

## Duplication prevention rules
- If logic is reused in 2 places, extract to shared helper/hook unless coupling would increase complexity.
- Keep feed parsing/network calls centralized in `lib/feed-api-client.ts`.
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
