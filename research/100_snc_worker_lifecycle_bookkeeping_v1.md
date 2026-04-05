# SNC Worker Lifecycle Bookkeeping V1

## Purpose

This round closes the first worker-lifecycle bookkeeping gap after the worker runtime fold-back slice.

The target was still bounded:

- do not build automatic spawning
- do not build a scheduler
- do not widen helper-tool or MCP surface

The actual goal was:

- keep SNC worker state aligned when host lifecycle hooks fire
- prevent spawned workers from remaining in stale active/queued limbo after timeout, kill, or cleanup

## What Landed

Updated code:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`

## What Changed

### 1. hook targets now include worker lifecycle seams

SNC hook config now recognizes:

- `subagent_spawned`
- `subagent_ended`

These are added as bounded hook targets beside the earlier transcript/tool shaping hooks.

### 2. `subagent_spawned` now syncs live worker state

When a host `subagent_spawned` hook arrives, SNC now:

- loads the persisted worker controller state for the requester session
- finds the matching tracked worker by `childSessionKey` or `runId`
- syncs host identity back into SNC state
- marks the worker as `running`

This keeps the controller-side worker view closer to the real host lifecycle.

### 3. `subagent_ended` now records lifecycle fallback outcomes

When a host `subagent_ended` hook arrives before or without a richer completion fold-back, SNC now records a bounded fallback result into worker state.

It distinguishes:

- `ok` -> bounded generic completion
- `error` / `timeout` -> failed
- `killed` / `reset` / `deleted` -> aborted

This result is intentionally minimal:

- lifecycle metadata
- bounded summary
- controller notes/actions

It is still not treated as a full replacement for rich completion-event fold-back.

### 4. later richer fold-back still wins

Worker fold-back merging is now keyed by worker identity rather than by `workerId + summary`.

That means:

- a generic lifecycle fallback can be replaced later
- a richer completion-event-derived fold-back will overwrite the generic one

This keeps lifecycle fallback useful without making it sticky in the wrong way.

## Boundary Kept

This round still does not do:

- controller-driven automatic worker spawning
- persistent/session-mode worker lanes
- `sessions_send` follow-up loops
- scheduler ownership
- generalized worker dashboard work

So the correct read is:

- lifecycle bookkeeping: landed
- controller launch-path integration: still pending
- broader orchestration runtime: still deferred

## Validation

Direct validation:

- `pnpm exec vitest run extensions/snc/src/config.test.ts extensions/snc/src/hook-scaffold.test.ts extensions/snc/src/worker-state.test.ts extensions/snc/src/engine.test.ts`
- `25/25` passed

Focused validation:

- `scripts/validate_snc_focus_v2.ps1`
- shaping/worker tests: `38/38`
- continuity baseline: `12/12`

Dispatcher validation:

- `scripts/validate_snc_dispatcher.ps1`
- focused vitest: `24/24`
- workspace typecheck passed with `8 GB` heap

## Practical Read

This round makes the SNC worker lane less fragile.

Before:

- worker results could fold back
- but lifecycle cleanup still had blind spots

Now:

- worker runtime fold-back exists
- worker lifecycle hooks can reconcile spawned/ended states
- timeout/kill/error cleanup no longer depends only on the richer completion path

That is still not a full orchestration system, but it is a meaningful Milestone 1 hardening step.
