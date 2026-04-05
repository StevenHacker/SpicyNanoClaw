# SNC Controller Launch Replay Governance V1

## Purpose

This packet records the next accepted `Milestone 2` controller-launch cut after:

- helper launch intent derivation
- worker diagnostics/state hygiene
- clean-host delivery rehearsal
- durable-memory diagnostics and controls

The goal of this slice was narrow:

- stop SNC from blindly requeueing the same helper job immediately after a recent terminal result
- prevent internal OpenClaw completion-event payloads from polluting SNC session-state extraction and triggering bogus helper launches

## Scope

Files changed:

- `extensions/snc/src/session-state.ts`
- `extensions/snc/src/session-state.test.ts`
- `extensions/snc/src/worker-launch-intent.ts`
- `extensions/snc/src/worker-launch-intent.test.ts`
- `extensions/snc/src/engine.ts`
- `extensions/snc/src/engine.test.ts`
- `research/102_snc_milestone2_program.md`
- `research/103_snc_module_workorders_round3.md`

## What Landed

### 1. Replay hold for repeated helper intents

`worker-launch-intent.ts` now applies a bounded cooldown window to identical helper launches.

Behavior:

- SNC still allows a bounded one-shot helper launch when the active assistant plan contains an explicit helper cue.
- If the same helper contract completed, failed, or aborted recently, SNC does not requeue it immediately.
- Instead, `assemble(...)` projects a `Recent launch replay holds` note into the `Worker launch lane`.

Why this matters:

- the controller no longer burns turns by reflexively relaunching the same helper
- recent worker results become part of operator-visible launch behavior instead of silent suppression

### 2. Completion-event hygiene in session state

`session-state.ts` now treats OpenClaw internal completion-event payloads as non-user-facing runtime data.

Behavior:

- assistant messages containing internal task completion events are excluded from persisted SNC session-state messages
- those internal payloads no longer participate in:
  - focus extraction
  - assistant-plan extraction
  - continuity-note extraction

Why this matters:

- worker completion data no longer mutates the continuity state as if it were a normal assistant response
- SNC no longer manufactures bogus helper jobs from internal runtime payloads

## Key Findings

1. Replay governance had to be tied to SNC-owned worker contracts, not generic transcript similarity. Using the existing helper contract/job identity keeps the lane bounded and deterministic.
2. The more serious real bug was not the cooldown itself; it was completion-event contamination of `session-state`, which changed focus/plan extraction and created false helper relaunches.
3. The accepted shape stays host-safe:
   - no scheduler takeover
   - no host runtime patching
   - no broader tool-surface expansion

## SNC Relevance

This slice directly improves `Milestone 2` usability:

- delegation is less noisy
- worker outcomes are more reusable
- controller launch behavior is more trustworthy in real long sessions

It also reinforces the broader SNC doctrine:

- internal runtime payloads should be folded into SNC-owned state deliberately
- they should not leak back into continuity state as ordinary assistant prose

## Validation

Targeted validation:

- `session-state.test.ts`
- `worker-launch-intent.test.ts`
- `engine.test.ts`
- `worker-diagnostics.test.ts`

Results:

- targeted Vitest: `27/27`

Gate validation:

- `validate_snc_focus_v2.ps1`
  - shaping: `49/49`
  - continuity: `20/20`
- `validate_snc_dispatcher.ps1`
  - focused vitest: `40/40`
  - workspace `tsc`: passed

## Outcome

`SNC-Milestone2-01` is now meaningfully tighter:

- explicit helper cues still open the launch lane
- recent identical helper work no longer auto-requeues
- internal completion events no longer poison SNC continuity state

The remaining controller-launch work is now smaller and more operational than architectural.
