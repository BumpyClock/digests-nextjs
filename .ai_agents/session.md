# Session Notes

## 2026-02-17 - Bead digests-nextjs-04s.6
- Closed `digests-nextjs-04s.6` after a final verification sweep.
- Verified no remaining source references to legacy feed-pipeline paths (`lib/feed-api-client.ts`, `lib/feed-fetcher.ts`, `lib/rss.ts`, `lib/feed-transformer.ts`, `lib/interfaces/feed-fetcher.interface.ts`, `utils/feed-validator.ts`) exist in application/service/worker code.
- Kept remaining references in historical docs/report notes only.
- `bd` workflow update:
  - Marked bead `in_progress` with execution plan note.
  - Completed and closed bead with summary.
- Learnings:
  - `rg` path-pattern checks are a quick and reliable final validation for namespace migration completeness.
- Challenges:
  - No additional code changes were required; completion relied on verification and tracker state cleanup.

## 2026-02-17 - Bead digests-nextjs-04s.12.3
- Completed `digests-nextjs-04s.12.3` (Document false positives and intentional keeps for dead-code scan).
- Expanded `docs/learned/knip-dead-code-waivers-2026-02-17.md` with explicit keep/defer/delete tables and review notes.
- Linked the waiver register from `docs/learned/knip-dead-code-triage-2026-02-17.md` so scan follow-up is discoverable from the report.
- Added a deleted-item list in triage for confirmed removals from `digests-nextjs-04s.12.2`.
- Updated `LEARNINGS.md` with a reminder to keep waiver registers linked to dead-code scan artifacts.
- No build/test commands were run in this iteration (docs-only work).

## 2026-02-17 - Bead digests-nextjs-04s.12.1
- Completed `digests-nextjs-04s.12.1` (Run knip dead-code scan and publish triage report).
- Ran `bunx knip` and captured a categorized report in `reports/knip-dead-code-2026-02-17.json` and `docs/learned/knip-dead-code-2026-02-17.md`.
- Confirmed safe-removal candidates:
  - `scripts/codex-beads-loop.ts`
  - `components/Feed/FeedCard/FeedCardBase.tsx` (duplicate of `components/Feed/shared/FeedCardBase.tsx`)
  - `components/ui/frosted-glass.tsx`
  - `app/web/(no-header)/settings/hooks/index.ts`
- Marked framework/route assets as intentional keeps (`sw.js`, `prism-tomorrow.css`, `app/pages/*.mdx`) and kept tests in triage as test-scope, not removable in this bead.
- Added to learning notes:
  - Knip’s scan requires separate interpretation layers (runtime, framework, test scope), and duplicate file copies are common false-positive sources.
- Challenge:
  - Large knip exported-symbol section is mostly false positive/intentional surface area and should be handled by a focused follow-up bead.

## 2026-02-17 - Bead digests-nextjs-04s.9.1
- Completed `digests-nextjs-04s.9.1` (CSS inventory and ownership/migration-risk classification).
- Added `docs/css-inventory-and-migration.md` with a full inventory and actionable classification matrix for every active CSS source.
- Scope included all style files in-tree (`app/globals.css`, `app/typography.css`, `app/generated-design-tokens.css`, `app/generated-themes.css`, `components/Feed/ArticleReader/ArticleReader.css`, `components/Feed/FeedMasterDetail/FeedMasterDetail.css`, `public/prism-tomorrow.css`) plus imported vendor CSS (`simplebar-react/dist/simplebar.min.css`).
- Classifications reflect migration posture for next phase: generated token/theme outputs as source-of-truth artifacts, global styles as split-then-migrate candidates, component CSS as scoped-retain, and vendor styles as dependency-owned.
- Added notes that earlier analysis references to `FeedGrid.css` are stale in the current branch.

### Learnings
- A short inventory document is the lowest-risk path to unblock styling refactor discussions without changing runtime behavior.

### Challenges
- Multiple style surfaces are interdependent (globals, token outputs, and component-local behavior), so safe migration paths are narrow and incremental rather than one-shot.

## 2026-02-17 - Bead digests-nextjs-04s.10.4
- Completed `digests-nextjs-04s.10.4` (Remove legacy sync paths and finalize state-boundary cleanup).
- Removed legacy item fallback in `CommandBar` from Zustand store so search/feed data now flows only from React Query props.
- Updated `components/CommandBar/CommandBar.tsx` to require `items` prop and `components/CommandBar/__tests__/CommandBar.test.tsx` to validate explicit-props behavior.
- Kept fallback behavior for feed subscriptions (`useSubscriptions`) unchanged for the command bar feed filter list, while eliminating a duplicate item state path.

### Learnings
- A required query-data item prop avoids hidden dependency on Zustand for server-owned payloads and simplifies component test setup.

### Challenges
- No test suite run in-session; only targeted static consistency changes were made.

## 2026-02-17 - Bead digests-nextjs-04s.11
- Completed `digests-nextjs-04s.11` (A5: Decouple worker startup from React component mount timing).
- Updated `components/worker-init.tsx` so `WorkerInitializer` no longer calls `workerService.start()` on mount or `workerService.stop()` on unmount.
- Kept `/sw.js` registration and moved worker runtime to demand-driven initialization driven by `WorkerService` calls.
- Config sync still stays explicit by updating `workerService.updateApiUrl` on `useApiConfigStore` changes so startup config remains deterministic.
- Commit: `0020cd3` (`fix: decouple worker init from React mount timing`).

### Learnings
- The previous mount-driven startup pattern could terminate workers unexpectedly under remount/development mode; demand-driven initialization keeps service lifecycle deterministic.

### Challenges
- No functional changes were made to `WorkerService` internals, so this relies on existing lazy init paths (`initialize` via `ensureInitialized`) and may need follow-up if startup must be eager in another execution context.

## 2026-02-17 - Bead digests-nextjs-04s.6.4
- Completed `digests-nextjs-04s.6.4` (Remove compatibility shims and finalize feed-pipeline docs).
- Confirmed via repo scan that no legacy feed pipeline paths remain in source:
  - `lib/feed-api-client.ts`
  - `lib/rss.ts`
  - `lib/feed-fetcher.ts`
  - `lib/interfaces/feed-fetcher.interface.ts`
  - `lib/feed-transformer.ts`
  - `utils/feed-validator.ts`
- Updated `docs/feed-pipeline-namespace-plan.md` to finalize shim-free boundaries and make stale path references explicit.
- Confirmed no further docs changes are required in `docs/architecture-boundaries-and-refactor-rules.md`.
- Added this session summary and finalization note for continuity.
- Commit: `640f4dc` (docs update finalizing feed pipeline shim cleanup status).

### Learnings
- Historical migration notes can become inconsistent after execution; a final docs pass should normalize wording from "compatibility shim" language to "shim-free steady state".

### Challenges
- Existing historical references required careful patching so plan context remains accurate without hiding progress.

## 2026-02-17 - Bead digests-nextjs-04s.1
- Closed `digests-nextjs-04s.1` (D1: Build adaptive modal/pane wrapper for reader and podcast detail).
- Selected bead in progress, implemented shared adaptive container + adaptive pane behavior, and completed the refactor.
- Added shared container and refactored:
  - `components/Feed/shared/AdaptiveDetailContainer.tsx`
  - `components/reader-view-modal.tsx`
  - `components/Podcast/PodcastDetailsModal/index.tsx`
  - `components/Feed/ReaderViewPane/ReaderViewPane.tsx`
  - `components/Podcast/PodcastDetailsPane/index.tsx`
  - `components/Feed/FeedMasterDetail/FeedMasterDetail.tsx`
- Closed the bead with commits:
  - `a1c8adc` (`feat: add adaptive detail container for reader and podcast panes`)
  - `5892f70` (`fix: keep modal scroll styling in adaptive detail panes`)

### Learnings
- Shared viewport-based container logic reduced duplicated modal/pane shell code.
- For parity, reader/podcast pane components still need `useIsMobile` to select modal-specific content variants.

### Challenges
- Did not run visual E2E verification in-session, so modal/pane parity on mobile/desktop should be checked in-app.

## 2026-02-17 - Bead digests-nextjs-6qd.12.1
- Selected next unblocked bead from `.beads/issues.jsonl`: `digests-nextjs-6qd.12.1` (Define CSS layering + token usage policy).
- Updated policy docs with explicit token-first and reduced-motion guidance:
  - `docs/css-motion-layering-policy.md`
  - `docs/architecture-boundaries-and-refactor-rules.md`
- Added durable learning in `LEARNINGS.md` to keep CSS/motion policy canonical and linked from contributor docs.
- Added bead plan/update comments in `.beads/interactions.jsonl`.

### Learnings
- Keep one canonical CSS/motion policy doc and cross-link from architecture docs to reduce style decision drift.

### Challenges
- `bd` CLI commands were blocked by environment policy, so issue status transitions in `.beads/issues.jsonl` could not be performed via normal CLI workflow.
## 2026-02-16 - Completed bead digests-nextjs-04s.6.1
- Implemented docs plan for feed pipeline namespace under `docs/feed-pipeline-namespace-plan.md` with target mapping and migration sequencing for parser/fetch/transform/validate modules.
- Updated `docs/architecture-boundaries-and-refactor-rules.md` to codify the namespace boundary and entrypoint import direction.
- Plan captures compatibility/rollback sequencing so 6.2-6.4 can execute without import breakage.
- Learnings: feed pipeline modules are currently split across `lib`, `utils`, and worker entrypoints; a staged migration with a new namespace contract first lowers risk.
- Challenges: no existing canonical `feed-pipeline` index exists, so migration must create namespace contracts before moving modules, then remove temporary shims.
## 2026-02-17 - Bead digests-nextjs-04s.6.2
- Completed by implementing namespace migration for parser/fetch/transform/validate modules:
  - Moved `lib/rss.ts`, `lib/feed-fetcher.ts`, `lib/feed-transformer.ts`, `lib/interfaces/feed-fetcher.interface.ts`, `lib/feed-api-client.ts`, and `utils/feed-validator.ts` into `lib/feed-pipeline/` (`feeds/fetcher.ts`, `feeds/http-fetcher.ts`, `feeds/transformer.ts`, `contracts/fetcher.interface.ts`, `api-client.ts`, `feeds/validator.ts`).
  - Added `lib/feed-pipeline/index.ts` barrel exports to support namespace entrypoint usage.
  - Updated call sites in `app/actions.ts`, `services/worker-service/service.ts`, and `workers/rss-worker.ts` to consume the new namespace paths and contracts.
- Learnings:
  - Moving modules via `git mv` then bulk import rewrites kept import churn low and preserved history for review.
  - Colocating validation and transform/fetch code in one namespace reduces cross-folder coupling for future pipeline work.
- Challenges:
  - Multiple stale docs references still mention old file locations; this bead only moved code, so follow-up docs cleanup is still needed for full consistency.

## 2026-02-17 - Bead digests-nextjs-04s.4.1
- Completed. Created `docs/images-module-layout.md` as canonical module layout and export reference.
- Linked image module ownership and migration policy in `docs/architecture-boundaries-and-refactor-rules.md`.
- Added LEARNINGS note reinforcing namespace-only image exports and canonical import path (`@/utils/images`).
- Key learning: `utils/images/` was already the canonical physical layout; needed mostly clear contract documentation and guardrails.
- Challenge: there are existing uncommitted workspace changes from prior state-boundary and feed-pipeline refactors, so this bead intentionally stayed documentation-only.

## 2026-02-17 - Bead digests-nextjs-04s.8
- Completed `digests-nextjs-04s.8` (A1: Route-tree clarification follow-up).
- Clarified `app/pages` migration decision in `docs/route-tree-and-boundaries.md`: explicit defer status, rationale, and migration trigger checklist.
- Confirmed no route-tree behavior changes were needed; only docs were updated for intent clarity.

### Learnings
- Explicitly documenting "defer" decisions prevents repeated migration churn and clarifies future routing changes.

### Challenges
- Existing wording already covered intent; the gap was making defer reason and trigger conditions explicit and actionable.
## 2026-02-17 - Bead digests-nextjs-04s.5
- Completed `digests-nextjs-04s.5` (O3: Merge HTML sanitizer and HTML utility surface).
- Added new canonical module `utils/html.ts` combining sanitizer utilities and HTML text helpers.
- Migrated all HTML utility callsites to import from `@/utils/html` across app and component paths.
- Removed legacy split modules `utils/htmlSanitizer.ts` and `utils/htmlUtils.ts`.

### Learnings
- A single utility module with named exports reduces duplicate imports and makes future HTML sanitization/cleanup refactors safer.

### Challenges
- Replacing imports across `app` paths required care for escaped route segments (`[id]`) in PowerShell file path handling.
## 2026-02-17 - Bead digests-nextjs-04s.10.2
- Completed `digests-nextjs-04s.10.2` (Migrate feed list/data flow to React Query-owned server state).
- Updated `hooks/useFeedSelectors.ts` so `useSubscriptions()` now prefers React Query `feeds` payload when available and falls back to persisted Zustand subscriptions.
- This shifts feed-list metadata consumption toward query cache while keeping subscriptions persisted in Zustand for client-bound configuration.
- Commit: `2640ad9`

### Learnings
- `useSubscriptions` was still using Zustand as the first read path for feed list metadata; wiring it to query data removes an easy duplication path and enforces single-source behavior for list payloads.

### Challenges
- `useSubscriptions` now imports `useFeedsData`, so every selector call shares the same React Query cache lifecycle as the main page flow, which should be reviewed in end-to-end behavior.
## 2026-02-17 - Bead digests-nextjs-04s.10.3
- Completed `digests-nextjs-04s.10.3` (Migrate reader-view/article fetch flow to React Query-owned server state).
- Centralized reader-view query ownership in `hooks/queries/use-reader-view-query.ts` via exported `readerViewQueryByUrl(...)`.
- Updated `components/Feed/FeedGrid/FeedGrid.tsx` to prefetch reader-view via `readerViewQueryByUrl`, removing direct `workerService.fetchReaderView` + inline validation in prefetch.
- Kept existing read UI behavior unchanged while removing a duplicate fetch path.

### Learnings
- Shared query option helpers eliminate subtle cache-key drift and make prefetch/use-query ownership clearly aligned.
- Small ownership refactors can remove duplicate fetch paths without altering UI surface.

### Challenges
- `readerViewQueryByUrl` needed to return deterministic query options; keeping `enabled` in the hook avoids accidental fetches when URLs are empty.
## 2026-02-17 - Bead digests-nextjs-04s.10.3
- Closed `digests-nextjs-04s.10.3` after adding `hooks/queries/__tests__/use-reader-view-query.test.tsx`.
- Added regression coverage for reader-view server-state ownership:
  - Query-key normalization for article URLs.
  - Shared `readerViewQueryByUrl` fetch path executed by `useReaderViewQuery`.
  - Explicit assertion that reader fetch calls flow through the shared worker call in React Query options.
- No behavior changes to runtime flows were needed because fetch/path unification already existed; this commit locks migration in tests.
- Commit was prepared with `feat(test): add reader-view query ownership regression test`.
- Learned: keep runtime regressions from previous handoff in sync with bead state files; `.beads/issues.jsonl` can diverge unless `bd close` is run in-session.
- Challenge: pre-existing unrelated local changes are present in the workspace and intentionally left untouched.

## 2026-02-17 - Bead digests-nextjs-04s.12.2
- Completed `digests-nextjs-04s.12.2` (Apply safe dead-code removals from scan report).
- Removed verified-unused modules confirmed by knip+repo-wide reference checks:
  - `components/SearchBar.tsx`
  - `components/conditional-header.tsx`
  - `lib/client.ts`
  - `utils/animation-config.ts`
- Kept unrelated workspace edits untouched and committed only these removals in `b2f8bdb`.
- Verified no remaining references before deletion with full-repo symbol and path-based searches.

### Learnings
- `knip` output plus direct import/reference validation is a practical low-risk path for dead-code deletions.
- Some modules can look candidate-like in reports but still be in active use; explicit source scans avoid unsafe removals.

### Challenges
- No behavioral test/build validation was run in-session; recommend a follow-up check before release rollout.

## 2026-02-17 - Bead digests-nextjs-04s.9.2
- Completed `digests-nextjs-04s.9.2` (low-risk migration follow-up for `A2`).
- Migrated the straightforward mobile layout rules from `components/Feed/FeedMasterDetail/FeedMasterDetail.css` into Tailwind classes directly in `components/Feed/FeedMasterDetail/FeedMasterDetail.tsx`:
  - `mobile-feed-master-detail`
  - `mobile-feed-list`
  - `mobile-reader-view`
  - `mobile-reader-back-button`
  - `mobile-reader-content`
- Kept transition animation/keyframe classes in the CSS file (`slide-*` and related `@keyframes`) because they are less trivial and unchanged.

### Learnings
- The feed master/detail mobile container is a good first migration candidate because structural layout classes convert cleanly without altering behavior.

### Challenges
- Remaining CSS for transition animations should be followed up separately to finish the Tailwind migration in a later bead.
## 2026-02-17 - Bead digests-nextjs-04s.14
- Completed `digests-nextjs-04s.14` with focused typing tightening in feed pipeline paths.
- Added strict reader-view payload guards in `lib/feed-pipeline/api-client.ts` and parse only when payloads pass validation.
- Removed broad `as WorkerResponse` assertions in `workers/rss-worker.ts` by returning typed response constructors for FEEDS_RESULT, READER_VIEW_RESULT, and ERROR responses.
- Kept runtime behavior unchanged; request/response shape, worker cache paths, and fallback behavior remain intact.
- Learned: introducing small response-builder helpers is an effective way to remove casting-heavy return objects without increasing branching.
- Challenge: strict casts were entrenched in worker messaging, and changing them safely required keeping the same error message formatting while preserving requestId propagation.

## 2026-02-17 - Bead digests-nextjs-04s.9.3
- Completed digests-nextjs-04s.9.3 (Constrain scoped CSS to complex reader surfaces).
- Updated components/Feed/FeedMasterDetail/FeedMasterDetail.tsx to replace FeedMasterDetail.css animation classes with token-backed Tailwind utilities (nimate-in, slide-in-from-*-full, duration-normal, ase-emphasized, motion-reduce:animate-none).
- Removed components/Feed/FeedMasterDetail/FeedMasterDetail.css from component scope.
- Kept reader prose stylesheet (components/Feed/ArticleReader/ArticleReader.css) as the remaining scoped CSS surface for reader rendering complexity.
- Learnings: 	ailwindcss-animate can replace many custom transition keyframes when transitions are entry-only and scoped to component state.
- Challenges: FeedMasterDetail previously relied on immediate mount-switch animation intent; behavior now relies on entry animations only due existing unmount timing, so parity should be visually checked on mobile.

## 2026-02-17 - Bead digests-nextjs-04s.10
- Completed digests-nextjs-04s.10 (A4: Define and execute state-boundary plan) by closing the parent bead after all child state-boundary migrations were completed.
- Verified child beads 10.1 through 10.4 are complete; no additional code changes were needed in this pass.
- Added closure note in d status with rationale that all feed reader-list / reader-view server-state ambiguity paths are removed in favor of React Query ownership, with Zustand limited to client state.
- No behavioral regressions observed in-session because this was a parent-closure bead; execution-level verification deferred.
- Learning: parent beads can now be closed safely when child bead completion proves the acceptance criteria end-to-end.
- Challenge: this pass required only issue-tracker reconciliation; operational handoff should confirm no hidden duplicate state paths outside child-bead scope.

## 2026-02-17 - Bead digests-nextjs-04s.12
- Completed digests-nextjs-04s.12 (A6: Run dead-code sweep and remove verified unused exports).
- Marked the bead in_progress in d, confirmed all child beads (12.1, 12.2, 12.3) were already done, and closed it with final completion summary.
- No runtime code changes were made in this iteration.
- Learned:
  - Existing report-follow-up work is complete once scan, removals, and intentional keep documentation are finalized at child-level.
  - Parent beads should be closed promptly after all children complete to keep dependency visibility in d accurate.
- Challenges:
  - This iteration was mostly tracker/documentation closure with minimal code surface; no functional deltas to validate.
