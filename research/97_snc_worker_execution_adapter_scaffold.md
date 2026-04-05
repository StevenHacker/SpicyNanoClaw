# SNC Worker Execution Adapter Scaffold

## Purpose

This round lands the first code slice for `SNC-M2-03`.

The goal was not to wire full worker orchestration into live runtime flow yet.
The goal was to make the accepted worker-policy doctrine executable as a bounded adapter layer over real OpenClaw host contracts.

## What Landed

New code:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.test.ts`

This adapter now provides five bounded capabilities:

1. build a host-facing `sessions_spawn` request from an SNC worker contract
2. reject unsupported v1 worker shapes early
3. mirror accepted/rejected spawn outcomes back into SNC controller state
4. build bounded `sessions_yield` / `subagents steer|kill` requests from tracked worker state
5. parse pushed OpenClaw internal completion events back into SNC worker results

## Key Design Boundary

The scaffold is intentionally host-aligned, not host-owning.

It uses the host's real surface model:

- `sessions_spawn`
- `sessions_yield`
- `subagents`
- internal task-completion event text

It does **not** yet:

- register new runtime tools
- add a scheduler
- own worker transport
- poll host state
- wire itself into `engine.afterTurn(...)`

So this is a true scaffold:

- real contracts
- real controller bookkeeping
- no fake end-to-end claims

## Main Behaviors

### 1. one-shot launch planning

`buildSncWorkerLaunchPlan(...)` converts a `SncWorkerJobContract` into a host-facing launch plan only if the contract matches the current bounded policy:

- `spawnMode="run"`
- `completionMode="one-shot"`

If not, it returns an explicit unsupported reason rather than pretending the first scaffold supports persistent or iterative workers.

### 2. controller-side launch bookkeeping

`prepareSncWorkerLaunch(...)` combines:

- brief generation
- queueing expected worker state
- host launch plan generation

`applySncWorkerLaunchResult(...)` then maps host outcomes back into SNC controller state:

- accepted -> `markSncWorkerSpawned(...)`
- forbidden/error -> failed worker result recorded in controller state

### 3. bounded host control calls

The adapter now has explicit builders for:

- yield
- steer
- kill

This matters because later runtime wiring can use one shared source of truth for these host-facing argument shapes instead of re-encoding them ad hoc in hook or engine code.

### 4. pushed completion-event parsing

The adapter can now parse OpenClaw internal completion-event text blocks:

- `source`
- `session_key`
- `session_id`
- `type`
- `task`
- `status`
- untrusted child result block

and convert them into SNC-local worker results.

This closes a practical gap:

- earlier design packets said SNC should consume pushed completion events
- now the controller-side parse path exists in code

## Validation

Direct validation completed successfully:

- targeted Vitest:
  - `extensions/snc/src/worker-policy.test.ts`
  - `extensions/snc/src/worker-execution.test.ts`
  - `10/10` tests passed
- workspace typecheck:
  - `NODE_OPTIONS=--max-old-space-size=8192`
  - `tsc -p tsconfig.json --noEmit`
  - passed

## Practical Read

This means `SNC-M2-03` has now crossed from design into code, but only for the safe first slice.

The correct status is:

- worker execution adapter scaffold: landed
- live runtime wiring: still pending
- persistent/iterative workers: still deferred
- general swarm runtime: still explicitly out of scope
