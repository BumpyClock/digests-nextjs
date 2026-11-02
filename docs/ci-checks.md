# Type safety and CI gates

Use Bun 1.2.19 and `bun install --frozen-lockfile`. `bun run typecheck` runs
Next 16 `next typegen` first, then the entire existing production TypeScript
project with `tsc --noEmit --incremental false`. Type generation supplies
`next-env.d.ts`, image declarations and generated route types without a server
or production build. No cached build-info result can hide a changed source.

`bun run build` now requires this check before `next build`. Next's
`typescript.ignoreBuildErrors` bypass was removed after the real checker passed
with generated prerequisites. Existing `prebuild` migration/design-token steps
and `test` precompilation guardrails remain intact.

Existing production tsconfig excludes `tests/**` and `**/__tests__/**`. The 24
existing Node tests pass separately. Those tests do not establish TSX/Jest test
coverage. No new repository-owned CI workflow or required-check name is enabled;
maintainer activation remains a separate decision.

Secret-free Linux validation proved that the real script passes, fails on a
new included file with a deliberate `string = 123` error, then passes after
restoration. Existing Biome configuration reports 21 check errors on the sampled
source baseline. A tracked pre-push gate remains deferred until its formatting
and lint prerequisites are agreed/repaired. No autofix or hook installation ran.
