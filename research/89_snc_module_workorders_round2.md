# SNC Module Workorders - Round 2

## Purpose

This file is the post-cycle-007 modular workorder set for SNC.

These are not generic ideas.
They are the next bounded engineering cuts after:

- durable-memory integration
- helper-tool registration decision
- worker-policy host-wiring decision

## Module Order

### SNC-M2-01 Milestone 1 Release Envelope

Goal:

- define what is actually in the first larger push

Why now:

- the current runtime core is already meaningful
- release boundaries are the main thing still fuzzy at milestone level

Primary inputs:

- `research/84_snc_milestone1_release_envelope.md`
- current accepted utility/integration packets

Expected outputs:

- canonical repo boundary
- validation gate list
- release/readme hygiene list
- push checklist

Current status:

- release-envelope design accepted
- milestone-facing README landed
- milestone-facing validation gate landed
- plugin package boundary tightened for release
- real `openclaw-snc-0.1.0.tgz` release candidate artifact produced

### SNC-M2-02 Durable Memory Hardening

Goal:

- strengthen the newly integrated durable-memory path without broadening host ownership

Why now:

- durable memory is now in the live continuity path
- the next quality gains are about promotion quality, pruning, and bounded lifecycle hygiene

Likely scope:

- stale entry handling
- promotion-rule tightening
- optional harvest diagnostics
- bounded catalog hygiene

Do not broaden into:

- host memory-slot ownership
- MCP/tool exposure

Current status:

- first hardening pass landed
- duplicate same-turn directive overcount removed
- weak stale derived-entry pruning landed
- stale entry-file cleanup landed

### SNC-M2-03 Worker Execution Adapter Scaffold

Goal:

- turn the accepted worker-policy wiring decision into a thin adapter over host `sessions_spawn` / `sessions_yield` / `subagents`

Why now:

- the policy layer is ready
- the host-wiring path is now clear enough for a bounded first cut

Likely scope:

- spawn request builder
- one-shot helper launch wrapper
- controller-side expected-completion bookkeeping
- no general swarm runtime

Do not broaden into:

- recursive orchestration
- custom scheduler ownership
- UI dashboard work

Current status:

- first scaffold landed
- host-facing `sessions_spawn` launch-plan builder landed
- yield / steer / kill argument builders landed
- accepted / rejected launch outcomes now map back into SNC controller state
- pushed internal completion-event parsing landed
- live runtime fold-back now landed through a plugin-owned `worker-state` layer
- `engine.afterTurn(...)` now records pushed completion events into persisted SNC worker state
- `engine.assemble(...)` now projects a bounded worker-controller section
- replayed completion events are now deduped
- lifecycle bookkeeping now lands through `subagent_spawned` / `subagent_ended` hook handling
- timeout / kill / cleanup cases now get bounded fallback worker results instead of leaving stale active state

Still pending before full runtime use:

- controller-issued launch initiation from real SNC policy flow
- any persistent/session-mode worker lane

### SNC-M2-04 Helper-Tool Registration Recheck

Goal:

- revisit helper-tool registration only after release-envelope and worker-adapter work are clearer

Why later:

- current accepted decision is to defer registration from Milestone 1
- there is no need to reopen it early

Likely scope later:

- confirm whether read-only registration changes milestone value enough to justify surface expansion

### SNC-M2-05 Bilingual Shaping Convergence

Goal:

- keep Chinese and English shaping behavior aligned on the live runtime path

Why now:

- the architect audit exposed a real gap between state extraction and transcript shaping
- shaping logic was also split across utility, hook, and maintenance paths

Current status:

- first convergence pass landed
- Chinese transcript-shaping cues landed
- `hook-scaffold` now uses the shared shaping utility
- `engine maintain()` now uses the shared shaping utility
- UTF-8 Chinese `session-state` extraction was re-verified with direct runtime probes

Do not broaden into:

- helper-tool registration
- worker execution wiring
- full session-state/schema redesign

Later scope only if new evidence justifies it:

- shared lexical primitive extraction
- shaping diagnostics
- further lifecycle-specific tuning from runner timing packets

## Current Recommendation

The next actual implementation cut should be:

1. release / push step from the Milestone 1 candidate
2. `SNC-M2-03` controller launch-path follow-up
3. `SNC-M2-05` follow-up only if new lifecycle evidence justifies more shaping work
4. optional release-hardening fixes only if public-push rehearsal exposes them

`SNC-M2-04` stays deferred unless milestone strategy changes.
