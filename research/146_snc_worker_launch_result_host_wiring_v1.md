# SNC Worker Launch Result Host Wiring V1

## Purpose

This packet records the next accepted `Milestone 2` controller-launch cut after:

- launch intent derivation
- replay governance
- worker diagnostics/state hygiene
- durable-memory diagnostics and controls

The goal of this slice was narrow:

- wire real `sessions_spawn` tool results back into SNC-owned worker state
- classify launch failures according to accepted OpenClaw/CC donor research
- make failed launch outcomes visible in the worker controller surface instead of leaving them as hidden tool noise

## Scope

Files changed:

- `extensions/snc/src/worker-execution.ts`
- `extensions/snc/src/worker-execution.test.ts`
- `extensions/snc/src/worker-state.ts`
- `extensions/snc/src/hook-scaffold.ts`
- `extensions/snc/src/hook-scaffold.test.ts`
- `research/102_snc_milestone2_program.md`
- `research/103_snc_module_workorders_round3.md`

Research packets applied:

- `research/135_oc20_worker_launch_failure_rejection_matrix.md`
- `research/136_oc21_worker_followup_control_transition_matrix.md`
- `research/137_cc16_delegation_failure_partial_result_matrix.md`
- `research/138_syn10_snc_worker_operator_envelope.md`

## What Landed

### 1. Real `sessions_spawn` tool-result fold-back

`hook-scaffold.ts` now treats `tool_result_persist` for `sessions_spawn` as a real runtime signal, not just a shaping surface.

Behavior:

- SNC inspects the persisted `sessions_spawn` tool result from the host
- if there is exactly one queued SNC worker expectation, that result is folded back into SNC worker state
- accepted launches now advance the queued worker into `spawned`
- failed launches now write a terminal worker result instead of leaving the worker stuck in `queued`

Why this matters:

- worker launch state is now driven by real host outcomes
- launch truth no longer lives only inside helper-library tests

### 2. Research-backed launch failure classification

`worker-execution.ts` now preserves four launch classes:

- `validation`
- `host-refused`
- `runtime-clean`
- `runtime-ambiguous`

Behavior:

- `forbidden` becomes host refusal
- `error` without identifiers becomes either validation or runtime-clean
- `error` with `childSessionKey` or `runId` becomes runtime-ambiguous

Why this matters:

- SNC can now tell the difference between:
  - fix the request
  - change host conditions
  - retry after fixing runtime
  - inspect an already-created child session before retrying

### 3. Prompt-visible failure fold-back for launch errors

Failed launch results now generate bounded worker fold-back notes through SNC-owned state.

Behavior:

- terminal launch failures are recorded in the tracking record
- SNC also materializes a bounded fold-back note from that result
- the worker controller section can now surface launch failures without requiring raw tool-result inspection

Why this matters:

- launch errors become usable controller information
- failure diagnostics are no longer stranded in tool-result transcript noise

## Key Findings

1. The most important missing piece in the worker lane was not more policy logic; it was host-result wiring. Until `sessions_spawn` results updated SNC state, the launch lane was only half real.
2. Launch failure classes needed to preserve host ambiguity. `error` with identifiers cannot be treated like a clean rejection without risking duplicate helper launches.
3. The correct insertion point stayed hot-pluggable:
   - `tool_result_persist`
   - plugin-owned state
   - no host runtime patching

## SNC Relevance

This slice materially upgrades `SNC-Milestone2-01`:

- queued helper intent now has a real host-result completion path
- launch failures are now actionable instead of generic
- the worker controller surface is closer to operator-grade behavior

It also stays aligned with the broader SNC doctrine:

- use verified OpenClaw seams
- borrow CC donor discipline, not CC product shell
- make failure handling explicit and bounded

## Validation

Targeted validation:

- `worker-execution.test.ts`
- `hook-scaffold.test.ts`

Results:

- targeted Vitest: `21/21`

Gate validation:

- `validate_snc_focus_v2.ps1`
  - shaping: `53/53`
  - continuity: `20/20`
- `validate_snc_dispatcher.ps1`
  - focused vitest: `42/42`
  - workspace `tsc`: passed

## Outcome

`SNC-Milestone2-01` is now much closer to a stable close:

- helper intent queues
- real host launch results fold back
- ambiguous failures are inspect-first
- failed launches become prompt-visible worker state

The remaining work is smaller and more operational:

- worker follow-up/reply visibility
- ambiguous recovery guidance
- final operator envelope for `Milestone 2`
