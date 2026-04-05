# SNC Worker Follow-Up Result Host Wiring V1

## Purpose

This round closes the next real gap in `SNC-Milestone2-01`.

Before this slice, SNC already had:

- bounded worker launch intent
- host-backed launch result fold-back for `sessions_spawn`
- pushed completion-event fold-back
- lifecycle fallback bookkeeping

What it still lacked was a real host-backed path for `sessions_send` follow-up results.

That meant SNC could:

- tell the model how to follow up with a worker

but it could not yet:

- fold the host's actual follow-up visibility result back into persisted SNC worker state

This round fixes that.

## What Landed

Updated runtime files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`

Updated validation files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `scripts/validate_snc_dispatcher.ps1`

## What Changed

### 1. SNC now persists bounded worker follow-up observations

`worker-policy.ts` now carries a bounded `followUp` observation on worker tracking records.

This observation is explicitly observational, not terminal. It stores:

- follow-up status
- observed time
- bounded summary
- whether a reply was actually observed
- bounded reply snippet
- optional delivery status / mode
- optional error text

This keeps SNC aligned with accepted host truth:

- accepted follow-up is not reply visibility
- timeout is not proof that the worker is dead
- an observed reply is a different outcome from a wait window with no fresh visible reply

### 2. `sessions_send` tool results now fold back into persisted SNC worker state

`worker-execution.ts` now parses follow-up tool-result payloads and converts them into bounded SNC follow-up observations.

`worker-state.ts` now resolves the target worker by:

- exact `childSessionKey` when available
- otherwise a bounded single-live-worker heuristic

`hook-scaffold.ts` now routes both:

- `sessions_spawn`
- `sessions_send`

through the same host-backed `tool_result_persist` sync lane.

This matters because SNC is no longer only projecting a follow-up lane.
It now also remembers the host's actual verdict about that follow-up lane.

### 3. Follow-up state stays non-terminal unless completion/fallback says otherwise

The new `sessions_send` fold-back path does **not** pretend that:

- `accepted`
- `ok`
- `timeout`
- `error`

are worker terminal states.

Instead, SNC keeps the worker tracking record live and attaches the follow-up observation to it.

This preserves the doctrine already established by accepted worker/operator packets:

- launch/control/follow-up are controller observations
- terminal truth should still come from:
  - completion-event fold-back
  - bounded lifecycle fallback

### 4. Dispatcher validation now covers hook-scaffold again

`scripts/validate_snc_dispatcher.ps1` now includes `extensions/snc/src/hook-scaffold.test.ts`.

That closes a real validation gap because this round changed the `tool_result_persist` routing seam directly.

## Validation

Targeted Vitest:

- `extensions/snc/src/worker-execution.test.ts`
- `extensions/snc/src/worker-state.test.ts`
- `extensions/snc/src/hook-scaffold.test.ts`

Result:

- `27/27` passed

Focused SNC validation:

- shaping focus: `56/56`
- continuity baseline: `20/20`

Dispatcher validation:

- focused vitest: `57/57`
- workspace `tsc`: passed with `8 GB` heap

## Practical Read

This round means `Milestone 2` worker control is now materially more real than `Milestone 1`.

SNC now has a bounded controller truth chain for workers that includes:

- launch intent
- launch projection
- launch result fold-back
- follow-up observation fold-back
- lifecycle fallback
- completion-event fold-back

It is still not a general orchestration platform.

But it is now much closer to being a trustworthy operator-grade specialized layer.

## What This Does Not Yet Claim

This round does **not** claim:

- a first-class public resume feature
- guaranteed visible reply after every follow-up
- recursive or persistent worker orchestration
- host takeover of worker control policy

Those remain bounded and evidence-gated.
