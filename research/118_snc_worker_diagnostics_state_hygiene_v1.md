# SNC Worker Diagnostics And State Hygiene V1

## Purpose

Close the first practical trust gap after the controller launch lane landed:

- operators need to see when worker state is getting stale
- plugin-owned worker state should stay bounded instead of quietly bloating

This slice keeps the scope narrow:

- diagnostics
- bounded persistence hygiene

It does **not** add UI, host registry ownership, or scheduler logic.

## Scope

Files landed in this slice:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-diagnostics.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-diagnostics.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## What Landed

### 1. Worker diagnostics projection

SNC now projects a dedicated `Worker diagnostics` section when live worker state needs operator attention.

Current diagnostics cover:

- stale queued helper launches
- stale blocked workers
- stale spawned/running workers

The section stays bounded and action-oriented.
It points the operator back to host-safe actions like:

- `sessions_spawn`
- `sessions_yield`
- narrowing or clearing stale worker state

### 2. Bounded worker-state hygiene

SNC worker persistence now keeps:

- all live worker records
- only the most recent bounded set of terminal worker records

This prevents plugin-owned worker state from growing indefinitely with old completed/failed/aborted records.

The recent fold-back summaries still remain available separately, so this is a hygiene cut, not a visibility wipe.

## Why This Matters

This slice follows the donor logic we accepted from CC:

- runtime state should be inspectable
- failures should not silently disappear
- controller-owned artifacts should stay bounded and predictable

It also follows the OpenClaw-side seam discipline:

- SNC owns its local controller diagnostics
- OpenClaw still owns execution, delivery, and hard control surfaces

## Validation

Targeted validation:

- `pnpm exec vitest run extensions/snc/src/worker-diagnostics.test.ts extensions/snc/src/worker-state.test.ts extensions/snc/src/engine.test.ts extensions/snc/src/worker-policy.test.ts extensions/snc/src/worker-execution.test.ts extensions/snc/src/worker-launch-intent.test.ts`
  - `32/32` passed

Gate validation:

- `scripts/validate_snc_focus_v2.ps1`
  - shaping focus: `45/45`
  - continuity baseline: `17/17`
- `scripts/validate_snc_dispatcher.ps1`
  - focused vitest: `35/35`
  - workspace `tsc`: passed with `8 GB` heap

## Practical Read

This does not make SNC a worker platform.
It makes the current bounded worker lane more trustworthy.

That is the correct `Milestone 2` move:

- better diagnostics
- cleaner plugin-owned state
- no host takeover

## Remaining Gap

The worker lane still needs:

- repeated-intent / replay policy refinement
- clean-host delivery rehearsal for the delegation path
- later optional helper-surface decisions only if they still serve the product
