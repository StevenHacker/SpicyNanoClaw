# SNC Controller Launch Path V1

## Purpose

Land the first real `Milestone 2` slice of controller-issued delegation without turning SNC into a scheduler.

The target was not "autonomous worker orchestration."
The target was narrower:

- derive a bounded helper launch only from explicit assistant helper cues
- persist that intent into SNC-owned worker state
- project a launch-ready lane back into later turns

## Scope

Files landed in this slice:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-launch-intent.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-launch-intent.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## What Landed

### 1. Bounded launch-intent derivation

SNC now derives a helper-worker launch intent only when the latest assistant plan contains an explicit helper cue.

Current derivation is intentionally conservative:

- one-shot only
- `spawnMode: "run"`
- `completionMode: "one-shot"`
- `maxTurns: 1`
- no follow-up spawning
- no recursive worker fan-out

### 2. Plugin-owned launch persistence

After `session-state` is persisted in `engine.afterTurn(...)`, SNC now attempts to derive and persist a launch intent into plugin-owned worker state.

This means launch readiness is no longer just an in-memory thought.
It becomes a stable SNC controller artifact.

### 3. Launch-lane projection

`engine.assemble(...)` now projects a dedicated `Worker launch lane` section when queued or active workers exist.

That section includes:

- launch-ready `sessions_spawn` guidance for queued one-shot helpers
- `sessions_yield` guidance when active workers may return pushed results
- bounded `subagents steer/kill` target hints for active workers

### 4. End-to-end tests and gate coverage

This slice is now covered at three levels:

- utility tests for launch intent derivation/persistence/rendering
- engine-level test proving `afterTurn(...)` queues launch intent and `assemble(...)` projects it
- both focus and dispatcher validation scripts include the new test file

## What This Enables

SNC now has a real controller-issued helper lane in product terms:

- SNC policy can create a worker contract from live session state
- SNC can persist the contract as a queued launch expectation
- later turns can see an explicit launch lane rather than relying on hidden transient state

This is the first `Milestone 2` step where delegation becomes operator-usable instead of only structurally present.

## Boundaries Preserved

This slice deliberately does **not** do these things:

- no host scheduler ownership
- no automatic broad worker spawning
- no recursive swarm behavior
- no persistent specialist sessions
- no host internal rewrites

The controller remains plugin-owned.
The execution substrate remains OpenClaw-owned.

## Validation

Targeted validation:

- `pnpm exec vitest run extensions/snc/src/worker-launch-intent.test.ts extensions/snc/src/engine.test.ts`
- `pnpm exec vitest run extensions/snc/src/worker-policy.test.ts extensions/snc/src/worker-execution.test.ts extensions/snc/src/worker-state.test.ts`

Gate validation:

- `scripts/validate_snc_focus_v2.ps1`
  - shaping focus: `42/42`
  - continuity baseline: `16/16`
- `scripts/validate_snc_dispatcher.ps1`
  - focused vitest: `31/31`
  - workspace `tsc`: passed with `8 GB` heap

## Remaining Gap

`Milestone 2` controller launch is still not fully closed.

What remains:

- stronger rerun / replay policy for repeated helper intents
- clearer controller-side diagnostics for queued vs blocked vs stale worker expectations
- final operator-facing clean-host delivery rehearsal for this worker lane

So this slice should be read as:

- `controller launch path: live first cut`
- not `controller orchestration: finished`
